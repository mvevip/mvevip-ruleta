# ========================================================
# MARKETING VIP - ROLLBACK INSTANTANEO A VERSION PRE-FORD
# Restaura el paquete Lambda y el bucket S3 desde backups/pre-ford
# ========================================================

param (
    [string]$Profile = "marketingvip",
    [string]$Region = "us-west-2",
    [string]$StackName = "MarketingVIP-Roulette-Stack"
)

$ErrorActionPreference = "Stop"
$deployBucket = "mvevip-recursos"
$backupPrefix = "s3://$deployBucket/marketingvip-roulette/backups/pre-ford"

Write-Host "=======================================================" -ForegroundColor Yellow
Write-Host "INICIANDO ROLLBACK INSTANTANEO A VERSION PRE-FORD" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Yellow

$outputs = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --profile $Profile `
    --region $Region `
    --query "Stacks[0].Outputs" `
    --output json | ConvertFrom-Json

$cfId = ($outputs | Where-Object { $_.OutputKey -eq "CloudFrontDistributionId" }).OutputValue
$frontendBucket = ($outputs | Where-Object { $_.OutputKey -eq "FrontendBucketName" }).OutputValue

Write-Host "[1/4] Restaurando api.zip en S3 desde backup pre-ford..." -ForegroundColor Cyan
aws s3 cp "$backupPrefix/api.zip" "s3://$deployBucket/marketingvip-roulette/api.zip" --profile $Profile --region $Region

Write-Host "[2/4] Restaurando funcion Lambda MarketingVIP-Roulette-Api-prod..." -ForegroundColor Cyan
aws lambda update-function-code `
    --function-name "MarketingVIP-Roulette-Api-prod" `
    --s3-bucket $deployBucket `
    --s3-key "marketingvip-roulette/backups/pre-ford/api.zip" `
    --profile $Profile `
    --region $Region | Out-Null

Write-Host "[3/4] Restaurando archivos de Frontend en S3 ($frontendBucket)..." -ForegroundColor Cyan
aws s3 sync "$backupPrefix/frontend/" "s3://$frontendBucket/" --delete --profile $Profile --region $Region

Write-Host "[4/4] Invalidando cache de CloudFront ($cfId)..." -ForegroundColor Cyan
aws cloudfront create-invalidation --distribution-id $cfId --paths "/*" --profile $Profile | Out-Null

Write-Host "=======================================================" -ForegroundColor Green
Write-Host "[OK] ROLLBACK COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "Recuerda en BD (si activaste premios Ford): UPDATE prizes SET active = 0 WHERE stand = 'ford';" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Green
