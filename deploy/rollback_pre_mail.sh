#!/usr/bin/env bash
# ========================================================
# MARKETING VIP - ROLLBACK A VERSION PRE-CORREO (antes del canal ?view=mail)
# Restaura el Lambda y el bucket S3 desde backups/pre-mail. No toca la base de datos.
# Requiere AWS CLI con permisos (perfil marketingvip / us-west-2).
# ========================================================
set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-us-west-2}"
DEPLOY_BUCKET="mvevip-recursos"
FRONTEND_BUCKET="marketingvip-autos-frontend-021891594659-us-west-2"
CF_ID="E1ZMRVAW1NYIDC"
FN="MarketingVIP-Roulette-Api-prod"
# Backup a restaurar: pre-mail (antes del canal Correo) o pre-icons (antes de la ruleta con íconos). Uso: ./rollback_pre_mail.sh [pre-icons]
BACKUP_NAME="${1:-pre-mail}"
BK="s3://$DEPLOY_BUCKET/marketingvip-roulette/backups/$BACKUP_NAME"

echo "[1/4] Restaurando api.zip..."
aws s3 cp "$BK/api.zip" "s3://$DEPLOY_BUCKET/marketingvip-roulette/api.zip" --region "$REGION"

echo "[2/4] Restaurando Lambda $FN..."
aws lambda update-function-code --function-name "$FN" \
  --s3-bucket "$DEPLOY_BUCKET" --s3-key "marketingvip-roulette/backups/$BACKUP_NAME/api.zip" --region "$REGION" >/dev/null
aws lambda wait function-updated --function-name "$FN" --region "$REGION"

echo "[3/4] Restaurando frontends en S3..."
aws s3 sync "$BK/frontend/" "s3://$FRONTEND_BUCKET/" --delete --region "$REGION"

echo "[4/4] Invalidando CloudFront..."
aws cloudfront create-invalidation --distribution-id "$CF_ID" --paths "/*" >/dev/null

echo "[OK] Rollback completado."
echo "Base de datos (manual, opcional): la columna prizes.icon es inofensiva para el código anterior; no hace falta quitarla."
