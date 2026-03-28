import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import Tabs from '../components/Tabs'

// ─── PageHeader ──────────────────────────────────────────────────────────────

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Employees" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Employees')
  })

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Employees" subtitle="Manage your team" />)
    expect(screen.getByText('Manage your team')).toBeInTheDocument()
  })

  it('renders actions slot', () => {
    render(<PageHeader title="Employees" actions={<button>Add</button>} />)
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('does not render subtitle when not provided', () => {
    const { container } = render(<PageHeader title="Employees" />)
    expect(container.querySelector('p')).toBeNull()
  })
})

// ─── Button ──────────────────────────────────────────────────────────────────

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('shows loading spinner when loading=true', () => {
    const { container } = render(<Button loading>Save</Button>)
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument()
  })

  it('calls onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled when loading', () => {
    render(<Button loading>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it.each(['primary', 'secondary', 'danger', 'ghost'] as const)(
    'renders variant %s',
    (variant) => {
      render(<Button variant={variant}>Btn</Button>)
      expect(screen.getByRole('button')).toBeInTheDocument()
    },
  )
})

// ─── StatusBadge ─────────────────────────────────────────────────────────────

describe('StatusBadge', () => {
  it('renders status text replacing underscores with spaces', () => {
    render(<StatusBadge status="on_leave" />)
    expect(screen.getByText('on leave')).toBeInTheDocument()
  })

  it('applies correct CSS classes for known statuses', () => {
    const { container } = render(<StatusBadge status="active" />)
    const badge = container.querySelector('span')!
    expect(badge.className).toContain('emerald')
  })

  it('applies fallback classes for unknown statuses', () => {
    const { container } = render(<StatusBadge status="unknown_status" />)
    const badge = container.querySelector('span')!
    expect(badge.className).toContain('gray')
  })
})

// ─── EmptyState ──────────────────────────────────────────────────────────────

describe('EmptyState', () => {
  it('renders message', () => {
    render(<EmptyState message="No employees found" />)
    expect(screen.getByText('No employees found')).toBeInTheDocument()
  })

  it('renders icon (string emoji)', () => {
    render(<EmptyState message="Nothing here" icon="🚀" />)
    expect(screen.getByText('🚀')).toBeInTheDocument()
  })

  it('renders action button when action + onAction provided', () => {
    const onAction = vi.fn()
    render(<EmptyState message="Empty" action="Add Item" onAction={onAction} />)
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument()
  })

  it('does not render action when not provided', () => {
    render(<EmptyState message="Empty" />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

// ─── Modal ───────────────────────────────────────────────────────────────────

describe('Modal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <p>Modal content</p>,
  }

  it('renders when open=true', () => {
    render(<Modal {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not render when open=false', () => {
    render(<Modal {...defaultProps} open={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders title', () => {
    render(<Modal {...defaultProps} />)
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(<Modal {...defaultProps} />)
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Modal {...defaultProps} onClose={onClose} />)
    await user.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('has proper accessibility attributes', () => {
    render(<Modal {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })
})

// ─── StatCard ────────────────────────────────────────────────────────────────

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Total Employees" value={42} />)
    expect(screen.getByText('Total Employees')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('formats number values with toLocaleString', () => {
    render(<StatCard label="Salary" value={1000000} />)
    // toLocaleString may produce different separators per locale, check it rendered
    expect(screen.getByText(/1.000.000|1,000,000/)).toBeInTheDocument()
  })

  it('renders string values as-is', () => {
    render(<StatCard label="Status" value="Active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders trend when provided', () => {
    render(<StatCard label="Hires" value={10} trend={{ direction: 'up', value: '12%' }} />)
    expect(screen.getByText('12%')).toBeInTheDocument()
  })
})

// ─── DataTable ───────────────────────────────────────────────────────────────

describe('DataTable', () => {
  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'role', header: 'Role' },
  ]

  const data = [
    { id: 1, name: 'Alice', role: 'Engineer' },
    { id: 2, name: 'Bob', role: 'Designer' },
  ]

  it('renders column headers', () => {
    render(<DataTable columns={columns} data={data} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Role')).toBeInTheDocument()
  })

  it('renders data rows', () => {
    render(<DataTable columns={columns} data={data} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows empty state when data is empty', () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="No results" />)
    expect(screen.getByText('No results')).toBeInTheDocument()
  })

  it('shows skeleton when loading=true', () => {
    const { container } = render(<DataTable columns={columns} data={[]} loading />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('sorts data when sortable column clicked', async () => {
    const user = userEvent.setup()
    const { container } = render(<DataTable columns={columns} data={data} />)
    // Click the sortable "Name" column header
    const nameHeader = screen.getByText('Name')
    await user.click(nameHeader)
    // After asc sort, first row should be Alice
    const rows = container.querySelectorAll('tbody tr')
    expect(rows[0]).toHaveTextContent('Alice')
    expect(rows[1]).toHaveTextContent('Bob')

    // Click again for desc
    await user.click(nameHeader)
    const rowsDesc = container.querySelectorAll('tbody tr')
    expect(rowsDesc[0]).toHaveTextContent('Bob')
    expect(rowsDesc[1]).toHaveTextContent('Alice')
  })

  it('calls onRowClick when row clicked', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(<DataTable columns={columns} data={data} onRowClick={onRowClick} />)
    await user.click(screen.getByText('Alice'))
    expect(onRowClick).toHaveBeenCalledWith(data[0])
  })
})

// ─── Tabs ────────────────────────────────────────────────────────────────────

describe('Tabs', () => {
  const tabs = [
    { key: 'all', label: 'All', count: 10 },
    { key: 'active', label: 'Active', count: 5 },
    { key: 'inactive', label: 'Inactive' },
  ]

  it('renders tab labels', () => {
    render(<Tabs tabs={tabs} active="all" onChange={() => {}} />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('highlights active tab', () => {
    render(<Tabs tabs={tabs} active="all" onChange={() => {}} />)
    const allButton = screen.getByText('All').closest('button')!
    expect(allButton.className).toContain('blue')
  })

  it('calls onChange when tab clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Tabs tabs={tabs} active="all" onChange={onChange} />)
    await user.click(screen.getByText('Active'))
    expect(onChange).toHaveBeenCalledWith('active')
  })

  it('shows count badge when provided', () => {
    render(<Tabs tabs={tabs} active="all" onChange={() => {}} />)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
