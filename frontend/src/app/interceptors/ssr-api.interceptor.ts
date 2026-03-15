import { HttpInterceptorFn } from '@angular/common/http';

export const ssrApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/api/')) {
    const serverReq = req.clone({ url: `http://backend:3000${req.url}` });
    return next(serverReq);
  }
  return next(req);
};
