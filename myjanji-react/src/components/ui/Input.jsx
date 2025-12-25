import { forwardRef, useState } from 'react'
import { HelpCircle, CheckCircle2 } from 'lucide-react'

const Input = forwardRef(({
  label,
  error,
  icon: Icon,
  type = 'text',
  className = '',
  containerClassName = '',
  required = false,
  tooltip,
  isValid,
  ...props
}, ref) => {
  const [showTooltip, setShowTooltip] = useState(false)
  
  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <div className="flex items-center gap-1.5">
          <label className="block text-sm font-medium text-header">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {tooltip && (
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip(!showTooltip)}
                className="text-body/40 hover:text-primary transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
              {showTooltip && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg max-w-xs">
                  {tooltip}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          )}
          {isValid && (
            <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
          )}
        </div>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-mid/60">
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={`
            w-full bg-input-bg rounded-2xl
            px-4 py-3.5 text-body
            placeholder:text-body/40
            border border-transparent
            focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50
            transition-all duration-300
            ${Icon ? 'pl-11' : ''}
            ${error ? 'ring-2 ring-status-breached/50 border-status-breached/50' : ''}
            ${isValid ? 'ring-2 ring-green-500/30 border-green-500/50' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-status-breached">{error}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input

export function Textarea({
  label,
  error,
  className = '',
  containerClassName = '',
  rows = 4,
  required = false,
  tooltip,
  isValid,
  ...props
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  
  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <div className="flex items-center gap-1.5">
          <label className="block text-sm font-medium text-header">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {tooltip && (
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-body/40 hover:text-primary transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
              {showTooltip && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg max-w-xs">
                  {tooltip}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          )}
          {isValid && (
            <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
          )}
        </div>
      )}
      <textarea
        rows={rows}
        className={`
          w-full bg-input-bg rounded-2xl
          px-4 py-3.5 text-body
          placeholder:text-body/40
          border border-transparent
          focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50
          transition-all duration-300
          resize-none
          ${error ? 'ring-2 ring-status-breached/50 border-status-breached/50' : ''}
          ${isValid ? 'ring-2 ring-green-500/30 border-green-500/50' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-status-breached">{error}</p>
      )}
    </div>
  )
}

export function Select({
  label,
  error,
  options = [],
  className = '',
  containerClassName = '',
  placeholder = 'Select an option',
  required = false,
  tooltip,
  isValid,
  ...props
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  
  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <div className="flex items-center gap-1.5">
          <label className="block text-sm font-medium text-header">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {tooltip && (
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-body/40 hover:text-primary transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
              {showTooltip && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg max-w-xs">
                  {tooltip}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          )}
          {isValid && (
            <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
          )}
        </div>
      )}
      <select
        className={`
          w-full bg-input-bg rounded-2xl
          px-4 py-3.5 text-body
          border border-transparent
          focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50
          transition-all duration-300
          ${error ? 'ring-2 ring-status-breached/50 border-status-breached/50' : ''}
          ${isValid ? 'ring-2 ring-green-500/30 border-green-500/50' : ''}
          ${className}
        `}
        {...props}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-status-breached">{error}</p>
      )}
    </div>
  )
}

