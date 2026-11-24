import ProductCard from './ProductCard';
import type { Product } from './types';

export default function ProductSection({ title, products }: { title: string; products: Product[] }) {
  return (
    <section className="stack" aria-label={title}>
      <h2 className="section-title">{title}</h2>
      <div className="grid grid-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
