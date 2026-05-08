export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'operational': 
    case 'completed':
    case 'ready to use':
      return 'bg-emerald-100 text-emerald-600 dark:text-emerald-100'
    case 'non-operational': 
    case 'pending manager':
    case 'not ready (waiting for repair)':
      return 'bg-yellow-100 text-yellow-600 dark:text-yellow-100'
    case 'under maintenance': 
    case 'pending supervisor':
      return 'bg-orange-100 text-orange-600 dark:text-orange-100'
    case 'canceled':
    case 'pending':
    case 'not ready (under repair)':
      return 'bg-red-100 text-red-600 dark:text-red-100'
    case 'not ready (equipment modification)':
      return 'bg-blue-100 text-blue-600 dark:text-blue-100'
    case 'transfer':
      return 'bg-purple-100 text-purple-600 dark:text-purple-100'
    case 'scrapped':
      return 'bg-mauve text-mauve-foreground dark:text-mauve-foreground'
    case 'not found':
      return 'bg-pink-100 text-pink-600 dark:text-pink-100'
    default:
      return 'bg-zinc-100 text-zinc-600 dark:text-zinc-100'
  }
}