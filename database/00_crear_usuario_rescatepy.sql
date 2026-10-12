-- =========================================================
-- OPCIONAL: CREAR EL USUARIO/ESQUEMA RESCATEPY
-- Ejecutar como SYSTEM u otro administrador de Oracle.
-- Cambiá la contraseña antes de ejecutarlo.
-- =========================================================

CREATE USER RESCATEPY
IDENTIFIED BY Cambiar_Clave_Oracle_123;

GRANT CREATE SESSION TO RESCATEPY;
GRANT CREATE TABLE TO RESCATEPY;
GRANT CREATE SEQUENCE TO RESCATEPY;
GRANT CREATE VIEW TO RESCATEPY;
GRANT UNLIMITED TABLESPACE TO RESCATEPY;

-- Después conectate como RESCATEPY y ejecutá:
-- database/01_rescatepy_oracle.sql
