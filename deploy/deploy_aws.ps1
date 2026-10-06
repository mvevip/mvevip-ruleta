# ========================================================
# MARKETING VIP - SCRIPT DE DESPLIEGUE AWS 100% SERVERLESS
# Subdominio: autos.mvevip.com
# Servicios: S3 + CloudFront + API Gateway + Lambda + RDS
# ========================================================

param (
    [string]$Profile = "marketingvip",
    [string]$Region = "us-west-2",
    [string]$StackName = "MarketingVIP-Roulette-Stack",
    [string]$DbPassword = ""
)

$ErrorActionPreference = "Stop"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "MARKETING VIP - DESPLIEGUE EN AWS (autos.mvevip.com)" -ForegroundColor Cyan
Write-Host "Perfil: $Profile | Region: $Region | Stack: $StackName" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Validar autenticacion AWS
try {
    $caller = aws sts get-caller-identity --profile $Profile --output json | ConvertFrom-Json
    $accountId = $caller.Account
    Write-Host "[OK] Autenticado como: $($caller.Arn) (Cuenta: $accountId)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] No se pudo autenticar con el perfil AWS '$Profile'." -ForegroundColor Red
    exit 1
}

# 2. Obtener contrasena de Base de Datos de .env si no se proveyo
if (-not $DbPassword) {
    if (Test-Path ".env") {
        $envLines = Get-Content ".env"
        foreach ($line in $envLines) {
            if ($line -match "^\s*DB_PASSWORD\s*=\s*(.+)$") {
                $DbPassword = $matches[1].Trim()
            }
        }
    }
}

if (-not $DbPassword) {
    Write-Host "[ERROR] No se encontro DB_PASSWORD en .env ni como parametro." -ForegroundColor Red
    exit 1
}

# 3. Bucket de Despliegue para Lambda ZIP
$deployBucket = "mvevip-recursos"
Write-Host "[*] Verificando bucket de artefactos ($deployBucket)..." -ForegroundColor Cyan

# 4. Empaquetar Backend para AWS Lambda
Write-Host "[*] Preparando paquete ZIP para AWS Lambda..." -ForegroundColor Cyan
Push-Location api
if (-not (Test-Path "node_modules")) {
    Write-Host "[*] Instalando dependencias de API..." -ForegroundColor DarkCyan
    npm install --omit=dev
}
$zipPath = "../deploy/api.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Crear ZIP usando tar de Windows
tar -a -c -f $zipPath src node_modules package.json
Pop-Location

Write-Host "[*] Subiendo api.zip a s3://$deployBucket/marketingvip-roulette/api.zip..." -ForegroundColor Cyan
aws s3 cp deploy/api.zip "s3://$deployBucket/marketingvip-roulette/api.zip" --profile $Profile --region $Region

# 5. Desplegar / Actualizar Stack de CloudFormation
Write-Host "[*] Aprovisionando Infraestructura CloudFormation (S3, CloudFront, Lambda, API Gateway)..." -ForegroundColor Cyan
aws cloudformation deploy `
    --template-file deploy/aws-infrastructure.yaml `
    --stack-name $StackName `
    --parameter-overrides `
        LambdaCodeBucket=$deployBucket `
        LambdaCodeKey="marketingvip-roulette/api.zip" `
        DatabasePassword=$DbPassword `
    --capabilities CAPABILITY_NAMED_IAM `
    --profile $Profile `
    --region $Region

# 6. Obtener Recursos Creados
Write-Host "[*] Consultando recursos del Stack..." -ForegroundColor Cyan
$outputs = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --profile $Profile `
    --region $Region `
    --query "Stacks[0].Outputs" `
    --output json | ConvertFrom-Json

$cfId = ($outputs | Where-Object { $_.OutputKey -eq "CloudFrontDistributionId" }).OutputValue
$cfDomain = ($outputs | Where-Object { $_.OutputKey -eq "CloudFrontDomainName" }).OutputValue
$frontendBucket = ($outputs | Where-Object { $_.OutputKey -eq "FrontendBucketName" }).OutputValue
$publicUrl = ($outputs | Where-Object { $_.OutputKey -eq "PublicUrl" }).OutputValue

Write-Host "[OK] Distribucion CloudFront ID: $cfId" -ForegroundColor Green
Write-Host "[OK] Dominio de CloudFront:     $cfDomain" -ForegroundColor Green
Write-Host "[OK] Bucket S3 Frontend:        $frontendBucket" -ForegroundColor Green

# 7. Compilar Frontends con Rutas Base
Write-Host "[*] Compilando App Movil Clientes (Root /)..." -ForegroundColor Cyan
Push-Location frontend-mobile
npm run build
Write-Host "[*] Subiendo Mobile a s3://$frontendBucket/..." -ForegroundColor DarkCyan
aws s3 sync dist "s3://$frontendBucket/" --delete --profile $Profile --region $Region
Pop-Location

Write-Host "[*] Compilando Pantalla Stand (Base /pantalla/)..." -ForegroundColor Cyan
Push-Location frontend-screen
$env:VITE_BASE_PATH = "/pantalla/"
npm run build
Remove-Item Env:\VITE_BASE_PATH
Write-Host "[*] Subiendo Pantalla a s3://$frontendBucket/pantalla/..." -ForegroundColor DarkCyan
aws s3 sync dist "s3://$frontendBucket/pantalla/" --delete --profile $Profile --region $Region
Pop-Location

Write-Host "[*] Compilando PWA Asesores (Base /admin/)..." -ForegroundColor Cyan
Push-Location frontend-admin
$env:VITE_BASE_PATH = "/admin/"
npm run build
Remove-Item Env:\VITE_BASE_PATH
Write-Host "[*] Subiendo Admin a s3://$frontendBucket/admin/..." -ForegroundColor DarkCyan
aws s3 sync dist "s3://$frontendBucket/admin/" --delete --profile $Profile --region $Region
Pop-Location

# Asegurar logotipo corporativo en todas las ubicaciones
aws s3 cp logotipo.png "s3://$frontendBucket/logotipo.png" --profile $Profile --region $Region
aws s3 cp logotipo.png "s3://$frontendBucket/pantalla/logotipo.png" --profile $Profile --region $Region
aws s3 cp logotipo.png "s3://$frontendBucket/admin/logotipo.png" --profile $Profile --region $Region

# 8. Invalidar Cache de CloudFront
Write-Host "[*] Invalidando cache de CloudFront..." -ForegroundColor Cyan
aws cloudfront create-invalidation --distribution-id $cfId --paths "/*" --profile $Profile | Out-Null

Write-Host "=======================================================" -ForegroundColor Green
Write-Host "DESPLIEGUE FINALIZADO CON EXITO EN AWS" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "URL Publica:              $publicUrl" -ForegroundColor Yellow
Write-Host "Pantalla Stand Ruleta:    $publicUrl/pantalla" -ForegroundColor Yellow
Write-Host "App Asesores / Admin:     $publicUrl/admin" -ForegroundColor Yellow
Write-Host "Dominio CloudFront:       $cfDomain" -ForegroundColor Yellow
Write-Host "ID Distribucion:          $cfId" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "REGISTRO EN GODADDY:" -ForegroundColor Cyan
Write-Host "   Tipo:   CNAME" -ForegroundColor White
Write-Host "   Nombre: autos" -ForegroundColor White
Write-Host "   Valor:  $cfDomain" -ForegroundColor White
Write-Host "   TTL:    1/2 hora (600s)" -ForegroundColor White
Write-Host "=======================================================" -ForegroundColor Green
