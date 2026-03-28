import { Link } from 'react-router-dom'

interface Props {
  employeeId: string
  name: string
  className?: string
}

export default function EmployeeLink({ employeeId, name, className = '' }: Props) {
  return (
    <Link
      to={`/employees?id=${employeeId}`}
      className={`text-blue-400 hover:text-blue-300 hover:underline ${className}`}
      onClick={e => e.stopPropagation()}
    >
      {name}
    </Link>
  )
}
