/**
 * VisuallyHidden - Screen reader only text utility
 * 
 * This component renders text that is hidden visually but still
 * accessible to screen readers. Useful for providing context to
 * screen reader users that sighted users get from visual context.
 * 
 * @example
 * <button>
 *   <SearchIcon />
 *   <VisuallyHidden>Search contracts</VisuallyHidden>
 * </button>
 */
export default function VisuallyHidden({ children, as: Component = 'span' }) {
    return (
        <Component className="sr-only">
            {children}
        </Component>
    )
}
