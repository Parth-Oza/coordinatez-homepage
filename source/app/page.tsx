"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { publicSiteUrl, supabase } from "../lib/supabase";

type Category = "Matcha" | "Vessels" | "Tools";

type Product = {
  slug: string;
  name: string;
  category: Category;
  price: number;
  originalPrice?: number;
  image: string;
  imageClass?: string;
  badge?: string;
  origin: string;
  summary: string;
  description: string[];
};

type CartLine = { slug: string; quantity: number };

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  customer_code: string;
};

type OrderRecord = {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
};

type WorkshopRecord = {
  id: string;
  session_label: string;
  status: string;
  created_at: string;
};

type ContactPayload = {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
};

type CheckoutPayload = {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  deliveryMethod: "ship" | "pickup";
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const products: Product[] = [
  {
    slug: "baba-mukashi-ceremonial-matcha",
    name: "Baba-Mukashi Ceremonial Matcha for Koicha | Uji, Kyoto (20g)",
    category: "Matcha",
    price: 35,
    originalPrice: 39,
    image: "./assets/social-powder.webp",
    badge: "Sale",
    origin: "Uji, Kyoto",
    summary: "Dense, elegant and designed for traditional koicha preparation.",
    description: [
      "A concentrated ceremonial matcha selected for koicha, where texture, sweetness and a lasting finish matter most.",
      "Stone-milled in small batches from shade-grown tencha, it opens with deep umami and settles into a smooth cocoa-like finish.",
    ],
  },
  {
    slug: "hatsu-mukashi-ceremonial-matcha",
    name: "Hatsu-Mukashi Ceremonial Matcha | Uji, Kyoto (20g)",
    category: "Matcha",
    price: 59,
    originalPrice: 65,
    image: "./assets/social-matcha.webp",
    badge: "Sale",
    origin: "Uji, Kyoto",
    summary: "A vivid ceremonial grade with rounded umami and a clean finish.",
    description: [
      "A refined usucha matcha with a silky body, spring-green aroma and a gentle natural sweetness.",
      "Prepared traditionally or over ice, it stays balanced, bright and exceptionally smooth.",
    ],
  },
  {
    slug: "house-blend-40g",
    name: "COORDINATEZ House Blend 40g.",
    category: "Matcha",
    price: 43,
    originalPrice: 52,
    image: "./assets/house-blend.webp",
    badge: "Sale",
    origin: "Kyoto, since 1803",
    summary: "Our signature creamy, balanced and approachable house matcha.",
    description: [
      "Our House Blend is crafted using ceremonial-grade matcha sourced from a historic Kyoto tea house established in 1803.",
      "It delivers a creamy texture with refined depth — smooth on entry, gently structured through the palate, and finishing with a soft, lingering sweetness.",
      "We blend with intention, balancing body, aroma and finish to create a matcha that is profound yet approachable.",
    ],
  },
  {
    slug: "matcha-chawan-light",
    name: "Matcha Chawan (Light) — Chicago Artist",
    category: "Vessels",
    price: 60,
    image: "./assets/chawan.webp",
    origin: "Handmade in Chicago",
    summary: "A hand-thrown bowl with a light glaze and generous whisking form.",
    description: [
      "Thrown and glazed by a Chicago ceramic artist, every bowl has a distinct rim, foot and surface.",
      "The wide form gives your whisk room to move while the tactile finish makes the daily ritual feel grounded.",
    ],
  },
  {
    slug: "whisk-150-prong",
    name: "Whisk 150 prong.",
    category: "Tools",
    price: 20,
    image: "./assets/whisk-coordinatez.jpg",
    imageClass: "whisk-image",
    origin: "White bamboo",
    summary: "A fine-pronged chasen for a smooth, cloud-like foam.",
    description: [
      "A traditional bamboo whisk shaped with 150 fine prongs to aerate matcha quickly and evenly.",
      "Rinse before use, whisk with a relaxed wrist, and allow it to air-dry on a whisk holder after every bowl.",
    ],
  },
  {
    slug: "matcha-chawan-dark",
    name: "Matcha Chawan (Dark) — Chicago Artist",
    category: "Vessels",
    price: 60,
    image: "./assets/workshop-shade.webp",
    origin: "Handmade in Chicago",
    summary: "A dark, expressive chawan that makes vivid matcha glow.",
    description: [
      "Hand-thrown locally with an iron-rich glaze, this chawan pairs a deep exterior with a tactile, organic profile.",
      "Each piece is unique and sized for both traditional usucha and a generous modern latte.",
    ],
  },
  {
    slug: "storage-tin-large",
    name: "Storage Tin (Large 60g size)",
    category: "Tools",
    price: 15,
    image: "./assets/tea-fields.webp",
    origin: "Airtight double lid",
    summary: "A light-blocking tin that keeps larger matcha refills fresh.",
    description: [
      "A simple double-lid tin sized for up to 60g of matcha.",
      "Store it in a cool, dry place and refill it as part of your regular tea ritual.",
    ],
  },
  {
    slug: "storage-tin-small",
    name: "Storage Tin (Small 30g size)",
    category: "Tools",
    price: 13,
    image: "./assets/social-shop.webp",
    origin: "Airtight double lid",
    summary: "A compact countertop tin for everyday matcha.",
    description: [
      "A compact, opaque storage tin with a fitted inner lid to protect aroma and color.",
      "Its 30g size is ideal for one open pouch or a small rotation of ceremonial matcha.",
    ],
  },
];

function productBySlug(slug: string) {
  return products.find((product) => product.slug === slug) ?? products[2];
}

function href(route: string) {
  return route === "home" ? "#home" : `#${route}`;
}

function routeFromHash() {
  if (typeof window === "undefined") return "home";
  return window.location.hash.replace(/^#\/?/, "") || "home";
}

function go(route: string) {
  window.location.hash = route;
}

function BackgroundVideo({ context, lazy = false }: { context: string; lazy?: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [playing, setPlaying] = useState(true);

  function togglePlayback() {
    frame.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: playing ? "pauseVideo" : "playVideo", args: [] }),
      "*",
    );
    setPlaying((value) => !value);
  }

  return (
    <div className={`background-video background-video-${context}`}>
      <iframe
        ref={frame}
        src="https://www.youtube-nocookie.com/embed/KlFXl--H8eM?autoplay=1&mute=1&controls=0&loop=1&playlist=KlFXl--H8eM&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0&enablejsapi=1"
        title={`${context} matcha preparation film`}
        tabIndex={-1}
        loading={lazy ? "lazy" : "eager"}
        allow="autoplay; encrypted-media; picture-in-picture"
      />
      <button
        className="media-toggle"
        type="button"
        aria-label={`${playing ? "Pause" : "Play"} background film`}
        onClick={togglePlayback}
      >
        <span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
      </button>
    </div>
  );
}

function Header({
  cartCount,
  overlay = false,
}: {
  cartCount: number;
  overlay?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className={`site-header ${overlay ? "header-overlay" : "header-solid"}`}>
        <a className="wordmark" href={href("home")} aria-label="COORDINATEZ home">
          COORDINATEZ
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href={href("shop")}>Shop</a>
          <a href={href("contact")}>Contact</a>
          <a href={href("account")}>Login</a>
          <a href={href("cart")}>Cart ({cartCount})</a>
        </nav>
        <div className="mobile-actions">
          <a href={href("cart")} aria-label={`${cartCount} items in cart`}>
            ({cartCount})
          </a>
          <button
            type="button"
            className={`menu-toggle ${open ? "open" : ""}`}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>
      <div className={`mobile-menu ${open ? "open" : ""}`}>
        {[
          ["Shop", "shop"],
          ["Contact", "contact"],
          ["Account", "account"],
          [`Cart (${cartCount})`, "cart"],
        ].map(([label, route]) => (
          <a key={route} href={href(route)} onClick={() => setOpen(false)}>
            {label}
          </a>
        ))}
      </div>
    </>
  );
}

function Quantity({
  value,
  onChange,
  label = "Quantity",
}: {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}) {
  return (
    <div className="quantity" aria-label={label}>
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value === 1}
      >
        −
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

function ProductImage({ product, className = "", image }: { product: Product; className?: string; image?: string }) {
  return (
    <div className={`product-image-wrap ${product.imageClass ?? ""} ${className}`}>
      {product.badge && <span className="sale-badge">{product.badge}</span>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image ?? product.image} alt={product.name} className="product-image" />
    </div>
  );
}

function ProductCard({
  product,
  onAdd,
  compact = false,
}: {
  product: Product;
  onAdd: (slug: string, quantity: number) => void;
  compact?: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function addProduct() {
    onAdd(product.slug, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <article className={`product-card ${compact ? "product-card-compact" : ""}`}>
      <a href={href(`product/${product.slug}`)} aria-label={`View ${product.name}`}>
        <ProductImage product={product} />
      </a>
      <a href={href(`product/${product.slug}`)} className="product-name-link">
        <h3 className="product-name">{product.name}</h3>
      </a>
      <p className="product-price">
        <span>{money.format(product.price)}</span>
        {product.originalPrice && <del>{money.format(product.originalPrice)}</del>}
      </p>
      {!compact && (
        <div className="product-actions">
          <Quantity value={quantity} onChange={setQuantity} label={`Quantity for ${product.name}`} />
          <button type="button" className="pill product-add" onClick={addProduct}>
            {added ? "Added" : "Add to cart"}
          </button>
        </div>
      )}
    </article>
  );
}

function Footer() {
  return (
    <footer className="footer section-pad">
      <div className="footer-brand">
        <h2><span>COORDINATEZ</span><br />— Kyoto Craft,<br />Modern Ritual</h2>
      </div>
      <div className="footer-block">
        <h3>Location</h3>
        <p>1857 W Chicago Ave</p>
        <p>Chicago, IL 60622</p>
        <a className="footer-small-link" href={href("contact")}>Hours & directions →</a>
      </div>
      <div className="footer-block footer-contact">
        <h3>Contact</h3>
        <a href="mailto:hello@coordinatez.com">HELLO@COORDINATEZ.COM</a>
        <a href="tel:+13127636407">(312) 763-6407</a>
        <div className="footer-links">
          <a href={href("shop")}>Shop</a>
          <a href={href("workshops")}>Workshops</a>
          <a href={href("account")}>Account</a>
        </div>
      </div>
    </footer>
  );
}

function PageShell({ cartCount, children }: { cartCount: number; children: ReactNode }) {
  return (
    <main>
      <Header cartCount={cartCount} />
      {children}
      <Footer />
    </main>
  );
}

function HomePage({
  cartCount,
  onAdd,
  onContact,
}: {
  cartCount: number;
  onAdd: (slug: string, quantity: number) => void;
  onContact: (payload: ContactPayload) => Promise<void>;
}) {
  return (
    <main>
      <section className="hero" id="top">
        <BackgroundVideo context="hero" />
        <Header cartCount={cartCount} overlay />
        <h1 className="hero-title"><span>Every shade</span><span>finds its</span><span>match</span></h1>
        <div className="hero-copy">
          <p className="hero-lede">
            COORDINATEZ was created from a simple idea — matcha deserves to be
            experienced properly.
          </p>
          <p>
            Rooted in Kyoto’s tea tradition and shaped for modern life,
            COORDINATEZ brings together careful sourcing, thoughtful blending,
            and intentional preparation.
          </p>
          <p>
            We believe matcha is more than a drink.<br />It is a ritual.<br />A pause.<br />
            A moment of clarity in a busy day.
          </p>
        </div>
      </section>

      <section className="products section-pad" id="products">
        <h2 className="section-kicker green">Our products</h2>
        <div className="product-grid home-product-grid">
          {products.slice(2, 5).map((product) => (
            <ProductCard key={product.slug} product={product} onAdd={onAdd} />
          ))}
        </div>
        <a className="pill shop-all" href={href("shop")}>Shop all</a>
      </section>

      <section className="workshop section-pad" id="workshops">
        <div className="workshop-heading-row">
          <h2 className="display green">Free matcha workshop</h2>
          <a className="pill register-desktop" href={href("workshops")}>Register</a>
        </div>
        <div className="workshop-grid">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="./assets/workshop-shade.webp" alt="Swirling green matcha" />
          <div className="poster-card" aria-label="COORDINATEZ workshop registration">
            <span className="poster-brand">COORDINATEZ workshop</span>
            <strong>New<br />dates</strong>
            <span className="poster-note">Free matcha workshop</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="./assets/workshop-room.webp" alt="Traditional Japanese tea room" />
          <a className="register-mobile" href={href("workshops")}>Register</a>
        </div>
      </section>

      <section className="learn section-pad">
        <h2 className="display stacked-title">Learn.<br />Whisk.<br />Taste.<br />Repeat.</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="whisking-photo" src="./assets/whisking.webp" alt="Whisking a bowl of matcha" />
        <div className="learn-copy">
          <p>Discover the art of traditional Japanese matcha in an intimate, hands-on class inside our shop.</p>
          <p>This guided workshop introduces ceremonial preparation, tasting techniques and the story behind the leaf — from Uji farms to your cup.</p>
          <p>Whether you’re new to matcha or already obsessed, this experience deepens your appreciation and upgrades your daily ritual.</p>
        </div>
      </section>

      <section className="about section-pad" id="about">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="tea-fields" src="./assets/tea-fields.webp" alt="Green tea fields in Japan" />
        <div className="about-grid">
          <h2 className="about-title">About COORDINATEZ<br />Find your match.</h2>
          <div className="about-copy">
            <p>COORDINATEZ was created around one simple belief:</p>
            <p>Matcha is not just a drink — it’s a ritual.</p>
            <p>We bring together traditional Japanese craftsmanship and modern daily life. Every bowl, every latte, every tin begins with carefully sourced matcha from Kyoto, blended for balance, depth and drinkability.</p>
            <p>We don’t chase trends.<br />We focus on flavor.</p>
          </div>
        </div>
      </section>

      <section className="social section-pad" id="social">
        <h2 className="social-title">Follow us on social</h2>
        <div className="social-grid">
          {[
            ["./assets/social-matcha.webp", "Fresh ceremonial matcha"],
            ["./assets/social-latte.webp", "Iced matcha latte"],
            ["./assets/social-powder.webp", "Bowls of bright matcha powder"],
            ["./assets/social-shop.webp", "Minimal COORDINATEZ shop interior"],
          ].map(([src, alt]) => (
            <a href={href("shop")} key={src} aria-label={alt}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} />
            </a>
          ))}
        </div>
        <a className="pill social-button" href={href("shop")}>Explore</a>
      </section>

      <HomeContact onContact={onContact} />
      <Footer />
    </main>
  );
}

function HomeContact({ onContact }: { onContact: (payload: ContactPayload) => Promise<void> }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await onContact({
        firstName: String(data.get("firstName") ?? ""),
        lastName: String(data.get("lastName") ?? ""),
        email: String(data.get("email") ?? ""),
        message: String(data.get("message") ?? ""),
      });
      setSent(true);
      form.reset();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="contact section-pad" id="contact">
      <BackgroundVideo context="contact" lazy />
      <div className="contact-blur blur-one" />
      <div className="contact-blur blur-two" />
      <div className="contact-intro">
        <h2 className="display">Work with COORDINATEZ</h2>
        <p>We love collaborating with people and brands who value quality and creativity.</p>
        <p>Interested in working together? Share a few details below — we’ll be in touch soon.</p>
      </div>
      <ContactForm sent={sent} error={error} busy={busy} onSubmit={submit} />
    </section>
  );
}

function ContactForm({ sent, error, busy, onSubmit }: { sent: boolean; error: string; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="contact-form" onSubmit={onSubmit}>
      <fieldset>
        <legend>Name</legend>
        <label><span>First Name <small>(required)</small></span><input name="firstName" autoComplete="given-name" required /></label>
        <label><span>Last Name <small>(required)</small></span><input name="lastName" autoComplete="family-name" required /></label>
      </fieldset>
      <label><span>Email <small>(required)</small></span><input type="email" name="email" autoComplete="email" required /></label>
      <label><span>Message <small>(required)</small></span><textarea name="message" rows={4} required /></label>
      <div className="form-footer">
        <button className="pill send-button" type="submit" disabled={busy}>{busy ? "Sending" : "Send"}</button>
        {sent && <span role="status">Thanks — your message has been received.</span>}
        {error && <span className="form-error" role="alert">{error}</span>}
      </div>
    </form>
  );
}

function ShopPage({ cartCount, onAdd }: { cartCount: number; onAdd: (slug: string, quantity: number) => void }) {
  const [filter, setFilter] = useState<"All" | Category>("All");
  const visible = filter === "All" ? products : products.filter((product) => product.category === filter);

  return (
    <PageShell cartCount={cartCount}>
      <section className="catalog-page section-pad">
        <div className="page-heading-row">
          <div>
            <p className="eyebrow">The collection</p>
            <h1 className="page-title green">Shop</h1>
          </div>
          <p className="page-intro">Ceremonial matcha and the tools that make a daily bowl feel intentional.</p>
        </div>
        <div className="filter-row" aria-label="Product filters">
          {(["All", "Matcha", "Vessels", "Tools"] as const).map((item) => (
            <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>
          ))}
          <span>{visible.length} items</span>
        </div>
        <div className="catalog-grid">
          {visible.map((product) => <ProductCard key={product.slug} product={product} onAdd={onAdd} compact />)}
        </div>
      </section>
    </PageShell>
  );
}

function ProductPage({
  slug,
  cartCount,
  onAdd,
}: {
  slug: string;
  cartCount: number;
  onAdd: (slug: string, quantity: number) => void;
}) {
  const product = productBySlug(slug);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const gallery = [product.image, "./assets/social-powder.webp", "./assets/whisking.webp"];
  const [selectedImage, setSelectedImage] = useState(product.image);
  const related = products.filter((item) => item.slug !== product.slug && item.category === product.category).slice(0, 3);

  function add() {
    onAdd(product.slug, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <PageShell cartCount={cartCount}>
      <section className="product-detail section-pad">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><a href={href("shop")}>Shop</a><span>›</span><span>{product.name}</span></nav>
        <div className="product-detail-grid">
          <div className="product-gallery">
            <ProductImage product={product} className="product-detail-image" image={selectedImage} />
            <div className="gallery-thumbs" aria-label="Gallery thumbnails">
              {gallery.map((galleryImage, index) => (
                <button type="button" key={`${galleryImage}-${index}`} className={selectedImage === galleryImage ? "active" : ""} aria-label={`Image ${index + 1}`} onClick={() => setSelectedImage(galleryImage)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={galleryImage} alt="" />
                </button>
              ))}
            </div>
          </div>
          <div className="product-information">
            <p className="eyebrow">{product.origin}</p>
            <h1>{product.name}</h1>
            <p className="detail-price"><span>{money.format(product.price)}</span>{product.originalPrice && <del>{money.format(product.originalPrice)}</del>}</p>
            <p className="product-summary">{product.summary}</p>
            <div className="detail-copy">{product.description.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
            <div className="detail-actions">
              <Quantity value={quantity} onChange={setQuantity} />
              <button type="button" className="pill" onClick={add}>{added ? "Added to cart" : "Add to cart"}</button>
            </div>
            <div className="product-notes">
              <details open><summary>Preparation</summary><p>Sift 2g, add 60ml water at 175°F, then whisk briskly for 15 seconds.</p></details>
              <details><summary>Shipping & pickup</summary><p>Complimentary Chicago pickup. Standard shipping is calculated at checkout.</p></details>
              <details><summary>Care</summary><p>Keep matcha sealed, cool and away from light. Ceramic pieces are hand-wash recommended.</p></details>
            </div>
          </div>
        </div>
      </section>
      {related.length > 0 && (
        <section className="related section-pad">
          <h2 className="section-kicker green">You may also like</h2>
          <div className="related-grid">{related.map((item) => <ProductCard key={item.slug} product={item} onAdd={onAdd} compact />)}</div>
        </section>
      )}
    </PageShell>
  );
}

function CartPage({
  cart,
  cartCount,
  setQuantity,
  remove,
}: {
  cart: CartLine[];
  cartCount: number;
  setQuantity: (slug: string, quantity: number) => void;
  remove: (slug: string) => void;
}) {
  const subtotal = cart.reduce((sum, line) => sum + productBySlug(line.slug).price * line.quantity, 0);

  return (
    <PageShell cartCount={cartCount}>
      <section className="cart-page section-pad">
        <h1 className="page-title green">Your cart</h1>
        {cart.length === 0 ? (
          <div className="empty-state"><p>Your ritual is waiting.</p><a className="pill" href={href("shop")}>Explore the shop</a></div>
        ) : (
          <div className="cart-layout">
            <div className="cart-lines">
              {cart.map((line) => {
                const product = productBySlug(line.slug);
                return (
                  <article className="cart-line" key={line.slug}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.image} alt={product.name} />
                    <div className="cart-line-copy"><p className="eyebrow">{product.category}</p><h2><a href={href(`product/${product.slug}`)}>{product.name}</a></h2><p>{money.format(product.price)}</p></div>
                    <div className="cart-line-actions"><Quantity value={line.quantity} onChange={(quantity) => setQuantity(line.slug, quantity)} /><button type="button" onClick={() => remove(line.slug)}>Remove</button></div>
                    <strong>{money.format(product.price * line.quantity)}</strong>
                  </article>
                );
              })}
            </div>
            <aside className="order-summary">
              <h2>Order summary</h2>
              <div><span>Subtotal</span><span>{money.format(subtotal)}</span></div>
              <div><span>Shipping</span><span>Calculated next</span></div>
              <div className="summary-total"><span>Total</span><span>{money.format(subtotal)}</span></div>
              <a className="pill" href={href("checkout")}>Checkout</a>
              <p>Secure checkout · Chicago pickup available</p>
            </aside>
          </div>
        )}
      </section>
    </PageShell>
  );
}

function CheckoutPage({
  cart,
  cartCount,
  user,
  placeOrder,
}: {
  cart: CartLine[];
  cartCount: number;
  user: User | null;
  placeOrder: (payload: CheckoutPayload) => Promise<string>;
}) {
  const [complete, setComplete] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const subtotal = cart.reduce((sum, line) => sum + productBySlug(line.slug).price * line.quantity, 0);
  const shipping = subtotal >= 75 ? 0 : 7;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const orderNumber = await placeOrder({
        email: String(data.get("email") ?? ""),
        firstName: String(data.get("firstName") ?? ""),
        lastName: String(data.get("lastName") ?? ""),
        address: String(data.get("address") ?? ""),
        city: String(data.get("city") ?? ""),
        postalCode: String(data.get("postalCode") ?? ""),
        deliveryMethod: data.get("deliveryMethod") === "pickup" ? "pickup" : "ship",
      });
      setComplete(orderNumber);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (orderError) {
      setError(orderError instanceof Error ? orderError.message : "We could not place your order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell cartCount={cartCount}>
      <section className="checkout-page section-pad">
        {complete ? (
          <div className="checkout-complete"><span>✓</span><p className="eyebrow">Order {complete}</p><h1>Thank you.</h1><p>Your order is saved to your COORDINATEZ account. You can follow its status from the account page.</p><a className="pill" href={href("account")}>View account</a></div>
        ) : cart.length === 0 ? (
          <div className="empty-state"><h1 className="page-title green">Checkout</h1><p>Your cart is empty.</p><a className="pill" href={href("shop")}>Shop the collection</a></div>
        ) : !user ? (
          <div className="checkout-auth-gate"><p className="eyebrow">One last step</p><h1 className="page-title green">Sign in to checkout</h1><p>Create an account or sign in so your cart, order ID and status stay securely connected to you.</p><a className="pill" href={href("account")}>Continue to account</a></div>
        ) : (
          <>
            <div className="page-heading-row checkout-heading"><div><p className="eyebrow">COORDINATEZ</p><h1 className="page-title green">Checkout</h1></div><a href={href("cart")}>← Return to cart</a></div>
            <div className="checkout-layout">
              <form className="checkout-form" onSubmit={submit}>
                <section><h2>Contact</h2><label>Email<input name="email" type="email" defaultValue={user.email ?? ""} required autoComplete="email" /></label><label className="checkbox"><input type="checkbox" /> Email me product notes and workshop dates</label></section>
                <section><h2>Delivery</h2><div className="choice-row"><label><input type="radio" name="deliveryMethod" value="ship" defaultChecked /> Ship</label><label><input type="radio" name="deliveryMethod" value="pickup" /> Chicago pickup</label></div><div className="field-grid"><label>First name<input name="firstName" required autoComplete="given-name" /></label><label>Last name<input name="lastName" required autoComplete="family-name" /></label><label className="full">Address<input name="address" required autoComplete="street-address" /></label><label>City<input name="city" required autoComplete="address-level2" /></label><label>ZIP code<input name="postalCode" required inputMode="numeric" autoComplete="postal-code" /></label></div></section>
                <section><h2>Confirmation</h2><div className="preview-payment"><strong>Database-backed order</strong><p>Your order and unique order ID will be saved securely. Payment processing is not enabled for this review build.</p></div></section>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="pill place-order" type="submit" disabled={busy}>{busy ? "Saving order" : "Place order"}</button>
              </form>
              <aside className="checkout-summary">
                {cart.map((line) => {
                  const product = productBySlug(line.slug);
                  return (
                    <div className="checkout-item" key={line.slug}>
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.image} alt="" />
                        <span>{line.quantity}</span>
                      </div>
                      <p>{product.name}</p>
                      <strong>{money.format(product.price * line.quantity)}</strong>
                    </div>
                  );
                })}
                <div><span>Subtotal</span><span>{money.format(subtotal)}</span></div><div><span>Shipping</span><span>{shipping ? money.format(shipping) : "Free"}</span></div><div className="summary-total"><span>Total</span><span>{money.format(subtotal + shipping)}</span></div>
              </aside>
            </div>
          </>
        )}
      </section>
    </PageShell>
  );
}

function WorkshopsPage({
  cartCount,
  user,
  onRegister,
}: {
  cartCount: number;
  user: User | null;
  onRegister: (payload: { attendeeName: string; email: string; sessionLabel: string }) => Promise<void>;
}) {
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      go("account");
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await onRegister({
        attendeeName: String(data.get("attendeeName") ?? ""),
        email: String(data.get("email") ?? ""),
        sessionLabel: String(data.get("sessionLabel") ?? ""),
      });
      setRegistered(true);
      form.reset();
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <PageShell cartCount={cartCount}>
      <section className="workshops-page">
        <div className="workshops-hero section-pad"><p className="eyebrow">Inside our Chicago shop</p><h1>Learn.<br />Whisk.<br />Taste.</h1><p>A focused introduction to traditional matcha preparation, sourcing and flavor — made welcoming for every experience level.</p><a className="pill" href="#workshop-register">Reserve a seat</a></div>
        <div className="workshops-story section-pad">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="./assets/workshop-room.webp" alt="A quiet Japanese tea room" />
          <div><p className="eyebrow green">The experience</p><h2>Slow down for one bowl.</h2><p>Over 75 minutes, our tea guide walks a small group through sifting, water temperature, whisking and mindful tasting.</p><ul><li>Taste two Kyoto matcha profiles</li><li>Prepare your own traditional bowl</li><li>Take home a preparation guide</li></ul></div>
        </div>
        <div className="sessions section-pad"><h2 className="section-kicker green">Upcoming sessions</h2><div className="session-grid">{[["Saturday, August 15","10:00 AM"],["Sunday, August 23","11:30 AM"],["Saturday, September 5","2:00 PM"]].map(([date,time], index) => <article key={date}><span>{String(index + 1).padStart(2,"0")}</span><h3>{date}</h3><p>{time} · 75 minutes</p><a href="#workshop-register">Select</a></article>)}</div></div>
        <div className="workshop-register section-pad" id="workshop-register"><div><p className="eyebrow">Complimentary · 8 seats per session</p><h2>Reserve your place.</h2><p>Choose a preferred date and we’ll hold your seat. Workshop attendance is complimentary.</p></div><form onSubmit={register}><label>Name<input name="attendeeName" required autoComplete="name" /></label><label>Email<input name="email" defaultValue={user?.email ?? ""} required type="email" autoComplete="email" /></label><label>Preferred session<select name="sessionLabel" required defaultValue=""><option value="" disabled>Select a date</option><option>August 15 · 10:00 AM</option><option>August 23 · 11:30 AM</option><option>September 5 · 2:00 PM</option></select></label><button className="pill" type="submit" disabled={busy}>{!user ? "Sign in to reserve" : busy ? "Saving request" : "Request a seat"}</button>{registered && <p role="status">Your seat request is saved to your account.</p>}{error && <p className="form-error" role="alert">{error}</p>}</form></div>
      </section>
    </PageShell>
  );
}

function ContactPage({ cartCount, onContact }: { cartCount: number; onContact: (payload: ContactPayload) => Promise<void> }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await onContact({
        firstName: String(data.get("firstName") ?? ""),
        lastName: String(data.get("lastName") ?? ""),
        email: String(data.get("email") ?? ""),
        message: String(data.get("message") ?? ""),
      });
      setSent(true);
      form.reset();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <PageShell cartCount={cartCount}>
      <section className="contact-page section-pad"><div className="contact-page-copy"><p className="eyebrow">Let’s make something thoughtful</p><h1 className="page-title green">Contact us</h1><h2>Partnership types</h2><dl><div><dt>Wholesale</dt><dd>Carry our retail tins or signature blends.</dd></div><div><dt>Pop-ups</dt><dd>Co-host events, tastings or creative collaborations.</dd></div><div><dt>Corporate events</dt><dd>Private matcha experiences for teams or clients.</dd></div><div><dt>Private label</dt><dd>Custom matcha blends for your brand.</dd></div></dl><div className="visit-card"><h2>Visit the shop</h2><p>1857 W Chicago Ave<br />Chicago, IL 60622</p><p>Mon–Fri 8–4<br />Sat–Sun 9–4</p></div></div><ContactForm sent={sent} error={error} busy={busy} onSubmit={submit} /></section>
      <section className="faq section-pad"><h2 className="section-kicker green">A few useful answers</h2>{[["Do you offer local pickup?","Yes. Select Chicago pickup during checkout and we’ll confirm when your order is ready."],["Can you host private workshops?","Yes. We offer intimate team, client and celebration sessions in our shop."],["Do you ship matcha?","We ship throughout the continental United States. Matcha is packed to protect freshness."]].map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
    </PageShell>
  );
}

function AccountPage({
  cartCount,
  user,
  profile,
  orders,
  workshops,
  authLoading,
  onSignIn,
  onSignUp,
  onSignOut,
}: {
  cartCount: number;
  user: User | null;
  profile: Profile | null;
  orders: OrderRecord[];
  workshops: WorkshopRecord[];
  authLoading: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (fullName: string, email: string, password: string) => Promise<string>;
  onSignOut: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    setBusy(true);
    setError("");
    setStatus("");
    try {
      if (mode === "signup") {
        const message = await onSignUp(String(data.get("fullName") ?? ""), email, password);
        setStatus(message);
      } else {
        await onSignIn(email, password);
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell cartCount={cartCount}>
      <section className="account-page section-pad">
        {authLoading ? (
          <div className="account-loading">Loading your account…</div>
        ) : user ? (
          <div className="account-panel">
            <div className="account-heading-row">
              <div><p className="eyebrow">Welcome back</p><h1 className="page-title green">Your ritual</h1></div>
              <div className="customer-id"><span>Customer ID</span><strong>{profile?.customer_code ?? "Creating…"}</strong><small>{user.email}</small></div>
            </div>
            <div className="account-cards">
              <article><span>Orders</span><strong>{orders.length}</strong><p>{orders.length ? "Your latest orders are listed below." : "Your first order is waiting."}</p><a href={href("shop")}>Shop matcha →</a></article>
              <article><span>Workshop requests</span><strong>{workshops.length}</strong><p>{workshops.length ? "Your seat requests are saved." : "Learn traditional preparation in our Chicago shop."}</p><a href={href("workshops")}>View dates →</a></article>
            </div>
            {orders.length > 0 && <div className="account-list"><h2>Order history</h2>{orders.map((order) => <article key={order.id}><div><strong>{order.order_number}</strong><span>{new Date(order.created_at).toLocaleDateString()}</span></div><span className="status-chip">{order.status}</span><strong>{money.format(Number(order.total))}</strong></article>)}</div>}
            {workshops.length > 0 && <div className="account-list"><h2>Workshop requests</h2>{workshops.map((workshop) => <article key={workshop.id}><div><strong>{workshop.session_label}</strong><span>{new Date(workshop.created_at).toLocaleDateString()}</span></div><span className="status-chip">{workshop.status}</span></article>)}</div>}
            <button className="account-signout" type="button" onClick={() => void onSignOut()}>Sign out</button>
          </div>
        ) : (
          <div className="login-layout">
            <div><p className="eyebrow">COORDINATEZ account</p><h1>Return to your ritual.</h1><p>Create a secure customer ID, keep your cart across devices, review orders and manage workshop reservations.</p></div>
            <form onSubmit={submit}>
              <div className="auth-tabs" role="tablist"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); setStatus(""); }}>Login</button><button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); setStatus(""); }}>Create account</button></div>
              <h2>{mode === "login" ? "Login" : "Create account"}</h2>
              {mode === "signup" && <label>Full name<input name="fullName" required autoComplete="name" /></label>}
              <label>Email<input name="email" type="email" required autoComplete="email" /></label>
              <label>Password<input name="password" type="password" minLength={8} required autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
              <button className="pill" type="submit" disabled={busy}>{busy ? "Please wait" : mode === "login" ? "Login" : "Create my ID"}</button>
              {status && <p className="form-success" role="status">{status}</p>}
              {error && <p className="form-error" role="alert">{error}</p>}
              <p className="form-note">Secure account access with email verification and protected customer data.</p>
            </form>
          </div>
        )}
      </section>
    </PageShell>
  );
}

export default function Storefront() {
  const [route, setRoute] = useState("home");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [workshops, setWorkshops] = useState<WorkshopRecord[]>([]);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const updateRoute = () => { setRoute(routeFromHash()); window.scrollTo({ top: 0 }); };
    updateRoute();
    window.addEventListener("hashchange", updateRoute);
    const saved = window.localStorage.getItem("coordinatez-cart");
    const restoreCart = window.setTimeout(() => {
      if (saved) {
        try { setCart(JSON.parse(saved)); } catch { window.localStorage.removeItem("coordinatez-cart"); }
      }
      setReady(true);
    }, 0);
    return () => {
      window.clearTimeout(restoreCart);
      window.removeEventListener("hashchange", updateRoute);
    };
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setOrders([]);
        setWorkshops([]);
      }
      setAuthLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    let active = true;
    void (async () => {
      const [profileResult, ordersResult, workshopsResult, cartResult] = await Promise.all([
        supabase.from("profiles").select("id,email,full_name,customer_code").eq("id", user.id).maybeSingle(),
        supabase.from("orders").select("id,order_number,total,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("workshop_registrations").select("id,session_label,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("cart_items").select("product_slug,quantity").eq("user_id", user.id),
      ]);
      if (!active) return;
      if (profileResult.data) setProfile(profileResult.data as Profile);
      setOrders((ordersResult.data ?? []) as OrderRecord[]);
      setWorkshops((workshopsResult.data ?? []) as WorkshopRecord[]);

      const remoteCart = (cartResult.data ?? []).map((line) => ({ slug: line.product_slug, quantity: line.quantity }));
      let localCart: CartLine[] = [];
      try {
        localCart = JSON.parse(window.localStorage.getItem("coordinatez-cart") ?? "[]");
      } catch {
        localCart = [];
      }
      const merged = new Map(remoteCart.map((line) => [line.slug, line.quantity]));
      localCart.forEach((line) => merged.set(line.slug, Math.max(merged.get(line.slug) ?? 0, line.quantity)));
      const mergedCart = Array.from(merged, ([slug, quantity]) => ({ slug, quantity }));
      if (localCart.length) {
        const { error } = await supabase.from("cart_items").upsert(
          mergedCart.map((line) => ({ user_id: user.id, product_slug: line.slug, quantity: line.quantity })),
          { onConflict: "user_id,product_slug" },
        );
        if (!error) window.localStorage.removeItem("coordinatez-cart");
      }
      if (active) setCart(mergedCart);
    })();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (ready && !user) window.localStorage.setItem("coordinatez-cart", JSON.stringify(cart));
  }, [cart, ready, user]);

  useEffect(() => {
    const selectors = [
      ".section-kicker",
      ".home-product-grid .product-card",
      ".shop-all",
      ".workshop-heading-row > *",
      ".workshop-grid > *",
      ".learn > *",
      ".about-grid > *",
      ".tea-fields",
      ".social-title",
      ".social-grid > *",
      ".social-button",
      ".contact-intro",
      ".contact-form",
      ".footer > *",
    ].join(",");
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selectors));
    if (!elements.length) return;

    document.documentElement.classList.add("motion-ready");
    elements.forEach((element, index) => {
      element.dataset.reveal = "";
      element.style.setProperty("--reveal-delay", `${(index % 4) * 70}ms`);
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.dataset.visible = "true");
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.visible = "true";
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [route]);

  const cartCount = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);

  function addToCart(slug: string, quantity: number) {
    const nextQuantity = (cart.find((line) => line.slug === slug)?.quantity ?? 0) + quantity;
    setCart((current) => {
      const existing = current.find((line) => line.slug === slug);
      return existing
        ? current.map((line) => line.slug === slug ? { ...line, quantity: line.quantity + quantity } : line)
        : [...current, { slug, quantity }];
    });
    if (user) {
      void supabase.from("cart_items").upsert(
        { user_id: user.id, product_slug: slug, quantity: nextQuantity },
        { onConflict: "user_id,product_slug" },
      ).then(({ error }) => {
        if (error) setToast("Cart sync failed — please retry");
      });
    }
    setToast(`${productBySlug(slug).name} added`);
    window.setTimeout(() => setToast(""), 1800);
  }

  function setLineQuantity(slug: string, quantity: number) {
    setCart((current) => current.map((line) => line.slug === slug ? { ...line, quantity } : line));
    if (user) void supabase.from("cart_items").update({ quantity, updated_at: new Date().toISOString() }).eq("user_id", user.id).eq("product_slug", slug);
  }

  function removeLine(slug: string) {
    setCart((current) => current.filter((line) => line.slug !== slug));
    if (user) void supabase.from("cart_items").delete().eq("user_id", user.id).eq("product_slug", slug);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(fullName: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${publicSiteUrl}#account` },
    });
    if (error) throw error;
    return data.session
      ? "Your account and customer ID are ready."
      : "Check your email to verify the account, then return here to log in.";
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setCart([]);
    setProfile(null);
    setOrders([]);
    setWorkshops([]);
  }

  async function submitContact(payload: ContactPayload) {
    const { error } = await supabase.from("contact_messages").insert({
      user_id: user?.id ?? null,
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      message: payload.message,
    });
    if (error) throw error;
  }

  async function registerWorkshop(payload: { attendeeName: string; email: string; sessionLabel: string }) {
    if (!user) throw new Error("Please sign in before reserving a seat.");
    const { data, error } = await supabase.from("workshop_registrations").insert({
      user_id: user.id,
      attendee_name: payload.attendeeName,
      email: payload.email,
      session_label: payload.sessionLabel,
    }).select("id,session_label,status,created_at").single();
    if (error) throw error;
    setWorkshops((current) => [data as WorkshopRecord, ...current]);
  }

  async function placeOrder(payload: CheckoutPayload) {
    if (!user) throw new Error("Please sign in before placing an order.");
    const { data, error } = await supabase.rpc("place_order", {
      p_email: payload.email,
      p_first_name: payload.firstName,
      p_last_name: payload.lastName,
      p_address: payload.address,
      p_city: payload.city,
      p_postal_code: payload.postalCode,
      p_delivery_method: payload.deliveryMethod,
    });
    if (error) throw error;
    const result = data as { id: string; order_number: string; total: number; status: string; created_at: string };
    setCart([]);
    setOrders((current) => [{ ...result }, ...current]);
    return result.order_number;
  }

  let page: ReactNode;
  if (route === "shop") page = <ShopPage cartCount={cartCount} onAdd={addToCart} />;
  else if (route.startsWith("product/")) page = <ProductPage key={route} slug={route.split("/")[1]} cartCount={cartCount} onAdd={addToCart} />;
  else if (route === "cart") page = <CartPage cart={cart} cartCount={cartCount} setQuantity={setLineQuantity} remove={removeLine} />;
  else if (route === "checkout") page = <CheckoutPage cart={cart} cartCount={cartCount} user={user} placeOrder={placeOrder} />;
  else if (route === "workshops") page = <WorkshopsPage cartCount={cartCount} user={user} onRegister={registerWorkshop} />;
  else if (route === "contact") page = <ContactPage cartCount={cartCount} onContact={submitContact} />;
  else if (route === "account") page = <AccountPage cartCount={cartCount} user={user} profile={profile} orders={orders} workshops={workshops} authLoading={authLoading} onSignIn={signIn} onSignUp={signUp} onSignOut={signOut} />;
  else page = <HomePage cartCount={cartCount} onAdd={addToCart} onContact={submitContact} />;

  return <>{page}<div className={`toast ${toast ? "show" : ""}`} role="status">{toast}<button type="button" onClick={() => go("cart")}>View cart</button></div></>;
}
