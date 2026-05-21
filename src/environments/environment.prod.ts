// Configuración de entorno para producción.
// Este archivo reemplaza a environment.ts durante ng build (production).
//
// ANTES DE HACER ng build --configuration production:
// Reemplaza apiUrl con la URL real del servidor desplegado.
// En CI/CD: usa @ngx-env/builder (OSS) o un paso de sed para inyectar la URL
// desde variables de entorno del pipeline.
//
// El dominio .invalid está reservado por IANA — nunca puede resolverse.
// Si ves esta URL en producción, el deploy fue sin configurar correctamente.
export const environment = {
  production: true,
  apiUrl: 'https://CONFIGURE-BEFORE-DEPLOY.invalid/api/v1',
};
