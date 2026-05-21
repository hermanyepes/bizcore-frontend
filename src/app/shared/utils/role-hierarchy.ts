import { TokenPayload } from '../../core/models/auth.model';

// Devuelve true si `viewer` tiene permiso para editar al usuario con `targetRole`/`targetDocumentId`.
// Regla: solo gestionar roles ESTRICTAMENTE inferiores.
// Excepción: Admin puede editar su propio perfil (sub del JWT == document_id del target).
export function canManageUser(
  viewer: TokenPayload | null,
  targetRole: string,
  targetDocumentId: string
): boolean {
  if (!viewer) return false;
  if (viewer.role === 'Superadmin') return true;
  if (viewer.role === 'Administrador') {
    // Autogestión: sub del JWT es el document_id del usuario logueado
    if (viewer.sub === targetDocumentId) return true;
    // Solo puede gestionar roles inferiores
    return targetRole === 'Supervisor' || targetRole === 'Empleado';
  }
  return false;
}
