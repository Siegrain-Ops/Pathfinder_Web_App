interface EmptyStateProps {
  title:       string
  description: string
  action?:     React.ReactNode
  icon?:       React.ReactNode
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && (
        <div className="mb-4 text-stone-500 text-5xl">{icon}</div>
      )}
      <h3 className="text-lg font-display font-semibold text-stone-300">{title}</h3>
      <p className="mt-1 text-sm text-stone-500 max-w-sm">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
