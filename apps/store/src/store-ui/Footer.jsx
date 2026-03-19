const Footer = () => {
  return (
    <footer className="border-t border-border mt-20">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <h3 className="font-display text-2xl font-bold mb-3">QS</h3>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              A curated marketplace for paintings, handmade artwork, and creative products from talented artists worldwide.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-foreground">Explore</h4>
            <ul className="space-y-2.5">
              {['Gallery', 'New Arrivals', 'Trending', 'Artists'].map((item) => (
                <li key={item}>
                  <a href="#/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-foreground">Support</h4>
            <ul className="space-y-2.5">
              {['Contact', 'Shipping', 'Returns', 'FAQ'].map((item) => (
                <li key={item}>
                  <a href="#/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">&copy; 2026 QS. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer

