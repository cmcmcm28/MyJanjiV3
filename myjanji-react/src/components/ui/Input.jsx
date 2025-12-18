import { forwardRef } from 'react'

const Input = forwardRef(({
  label,
  error,
  icon: Icon,
  type = 'text',
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-header">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-body/50">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={`
            w-full bg-input-bg rounded-xl
            px-4 py-3 text-body
            placeholder:text-body/40
            focus:outline-none focus:ring-2 focus:ring-primary/30
            transition-all duration-200
            ${Icon ? 'pl-11' : ''}
            ${error ? 'ring-2 ring-status-breached/50' : ''}
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
  ...props
}) {
  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-header">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={`
          w-full bg-input-bg rounded-xl
          px-4 py-3 text-body
          placeholder:text-body/40
          focus:outline-none focus:ring-2 focus:ring-primary/30
          transition-all duration-200
          resize-none
          ${error ? 'ring-2 ring-status-breached/50' : ''}
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
  ...props
}) {
  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-header">
          {label}
        </label>
      )}
      <select
        className={`
          w-full bg-input-bg rounded-xl
          px-4 py-3 text-body
          focus:outline-none focus:ring-2 focus:ring-primary/30
          transition-all duration-200
          ${error ? 'ring-2 ring-status-breached/50' : ''}
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

