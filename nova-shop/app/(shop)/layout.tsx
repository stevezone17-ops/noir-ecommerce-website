import {catalog} from '../../lib/catalog';
import {ShopFrame} from './store';
import './shop.css';
export const dynamic='force-dynamic';
export default async function Layout({children}:{children:React.ReactNode}){
  return <ShopFrame products={await catalog()}>{children}</ShopFrame>;
}
