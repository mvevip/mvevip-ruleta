#!/usr/bin/env bash
set -e

# ========================================================
# MARKETING VIP - SCRIPT DE DESPLIEGUE AWS (BASH)
# Perfil: marketingvip
# ========================================================

PROFILE="marketingvip"
REGION="us-east-1"
STACK_NAME="MarketingVIP-Roulette-Stack"

echo "🏎️  Iniciando despliegue de Marketing VIP Ruleta en AWS..."
echo "👉 Perfil AWS: $PROFILE | Región: $REGION"

# 1. Validar identidad
aws sts get-caller-identity --profile "$PROFILE"

# 2. Desplegar Stack CloudFormation
echo "📦 Desplegando CloudFormation ($STACK_NAME)..."
aws cloudformation deploy \
    --template-file deploy/aws-infrastructure.yaml \
    --stack-name "$STACK_NAME" \
    --capabilities CAPABILITY_NAMED_IAM \
    --profile "$PROFILE" \
    --region "$REGION"

# 3. Obtener nombres de buckets
SCREEN_BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --profile "$PROFILE" --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='ScreenBucketName'].OutputValue" --output text)
MOBILE_BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --profile "$PROFILE" --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='MobileBucketName'].OutputValue" --output text)

echo "S3 Screen Bucket: $SCREEN_BUCKET"
echo "S3 Mobile Bucket: $MOBILE_BUCKET"

# 4. Compilar y sincronizar Screen
echo "🖥️ Compilando Frontend Screen..."
cd frontend-screen
npm install
npm run build
aws s3 sync dist "s3://$SCREEN_BUCKET" --delete --profile "$PROFILE"
cd ..

# 5. Compilar y sincronizar Mobile
echo "📱 Compilando Frontend Mobile..."
cd frontend-mobile
npm install
npm run build
aws s3 sync dist "s3://$MOBILE_BUCKET" --delete --profile "$PROFILE"
cd ..

echo "🏁 Despliegue completado con éxito."
