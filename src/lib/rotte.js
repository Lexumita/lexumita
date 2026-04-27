// Helper per rotte dinamiche user vs avvocato.
// User entra da /area/*, avvocato da /banca-dati/*.

export function baseRouteBancaDati(role) {
    return role === 'user' ? '/area' : '/banca-dati'
}

export function rottaSentenza(role, fonte, id) {
    return `${baseRouteBancaDati(role)}/${fonte}/${id}`
}

export function rottaPrassi(role, id) {
    return `${baseRouteBancaDati(role)}/prassi/${id}`
}