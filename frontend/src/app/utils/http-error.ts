import { HttpErrorResponse } from '@angular/common/http';

export function getHttpErrorMessage(
  err: HttpErrorResponse,
  fallback = 'Ocurrió un error inesperado. Intentá nuevamente.',
): string {
  if (err.status === 0) {
    return 'No se pudo conectar con el servidor. Verificá tu conexión o intentá en unos instantes.';
  }

  if (err.status >= 500) {
    return 'Hubo un problema en el servidor. Intentá nuevamente más tarde.';
  }

  if (err.status === 413) {
    return 'El archivo que intentás subir supera el tamaño máximo permitido (5 MB).';
  }

  if (err.status === 429) {
    return 'Demasiados intentos seguidos. Esperá un momento antes de volver a probar.';
  }

  if (err.status === 408) {
    return 'La solicitud tardó demasiado en responder. Intentá nuevamente.';
  }

  const serverMessage = err.error?.message;
  if (serverMessage) {
    return Array.isArray(serverMessage) ? serverMessage[0] : serverMessage;
  }

  return fallback;
}