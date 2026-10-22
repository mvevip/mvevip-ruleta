-- Informe (solo lectura): clientes del canal Correo cuyos datos corrigieron en el formulario respecto al CRM.
-- Sirve para que el equipo actualice el CRM manualmente. Requiere la migración 005.
SELECT
  l.created_at,
  l.crm_match,
  l.crm_email                                      AS correo_en_crm,
  l.email                                          AS correo_ingresado,
  CONCAT_WS(' ', C.cli_nombre, C.cli_apellido)     AS nombre_en_crm,
  l.name                                           AS nombre_ingresado,
  C.cli_celular                                    AS celular_en_crm,
  l.phone                                          AS celular_ingresado
FROM marketingvip_roulette.leads l
LEFT JOIN mve.mve_clientes C ON C.cli_email = l.crm_email
WHERE l.screen_id = 'MAIL_01'
  AND l.crm_email IS NOT NULL
  AND (l.is_test = 0 OR l.is_test IS NULL)
  AND (l.crm_match = 'corrected' OR l.email <> l.crm_email OR l.phone <> COALESCE(C.cli_celular, ''))
ORDER BY l.created_at DESC;
