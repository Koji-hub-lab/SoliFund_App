import api from './axios';

// Charge toutes les pages d'une liste paginée ({ donnees, pages }) et renvoie
// { donnees, total } : utilisé par les pages admin qui affichent la liste complète.
export async function chargerToutesLesPages(url, params = {}) {
  const premiere = await api.get(url, { params: { ...params, page: 1, limite: 50 } });
  const donnees = [...premiere.data.donnees];
  for (let page = 2; page <= premiere.data.pages; page++) {
    const res = await api.get(url, { params: { ...params, page, limite: 50 } });
    donnees.push(...res.data.donnees);
  }
  return { donnees, total: premiere.data.total };
}
