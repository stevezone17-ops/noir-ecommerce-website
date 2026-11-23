import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{
 return {rules:{userAgent:'*',allow:'/',disallow:['/admin','/account','/orders','/checkout','/api/']},sitemap:process.env.SITE_URL?new URL('/sitemap.xml',process.env.SITE_URL).href:undefined};
}
