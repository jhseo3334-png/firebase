export function isAdminUid(uid, configuredUids = import.meta.env.VITE_ADMIN_UIDS || '') {
  return typeof uid === 'string' && uid.length > 0 && configuredUids.split(',').some(value => value.trim() === uid);
}
