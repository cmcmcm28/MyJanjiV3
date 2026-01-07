/**
 * SkipLink - Accessibility skip navigation component
 * 
 * Provides a link that allows keyboard users to skip past navigation
 * and jump directly to the main content. The link is hidden until focused.
 * 
 * @example
 * // In App.jsx or layout
 * <SkipLink />
 * <Header />
 * <main id="main-content">...</main>
 */
export default function SkipLink({ href = '#main-content', children = 'Skip to main content' }) {
    return (
        <a
            href={href}
            className="
        sr-only focus:not-sr-only
        focus:fixed focus:top-4 focus:left-4 focus:z-[100]
        focus:px-4 focus:py-2
        focus:bg-primary focus:text-white
        focus:rounded-lg focus:shadow-lg
        focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
        font-semibold text-sm
        transition-all duration-200
      "
        >
            {children}
        </a>
    )
}
