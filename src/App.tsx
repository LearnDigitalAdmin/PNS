import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useImageFallback } from './lib/useImageFallback';
import { useSmartImageFit } from './lib/useSmartImageFit';

export default function App() {
  useImageFallback();
  // useSmartImageFit();
  return <RouterProvider router={router} />;
}
