export const apiPaths = {
  artworks: '/api/artworks',
  exhibitions: '/api/exhibitions',
  artists: '/api/artists',
  interactions: '/api/interactions',
  reviews: '/api/reviews',
  auth: '/api/auth',
};

export function artworkPath(id: string, action?: 'submit' | 'takedown') {
  return `${apiPaths.artworks}/${id}${action ? `/${action}` : ''}`;
}

export function exhibitionPath(id: string, action?: 'submit') {
  return `${apiPaths.exhibitions}/${id}${action ? `/${action}` : ''}`;
}

export function reviewDecisionPath(targetType: 'artworks' | 'exhibitions', id: string) {
  return `${apiPaths.reviews}/${targetType}/${id}/decision`;
}

export function reviewOverturnPath(targetType: 'artworks' | 'exhibitions', id: string) {
  return `${apiPaths.reviews}/${targetType}/${id}/overturn`;
}
