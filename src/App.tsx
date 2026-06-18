import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useImageFallback } from './lib/useImageFallback';

export default function App() {
  useImageFallback();
  return <RouterProvider router={router} />;
}
