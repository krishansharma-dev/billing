'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster, toast } from 'sonner';
import { createClient } from '@/lib/client';
import { Database } from '@/lib/types';
import { Search, Edit, Trash2, Plus, X, Book, DollarSign, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

type LedgerEntry = Database['public']['Tables']['ledger_entries']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];
type Vendor = Database['public']['Tables']['vendors']['Row'];

interface LedgerStats {
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
}

export default function LedgerEntriesPage() {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredLedgerEntries, setFilteredLedgerEntries] = useState<LedgerEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<LedgerStats>({
    totalDebits: 0,
    totalCredits: 0,
    netBalance: 0,
  });
  const [formData, setFormData] = useState<Partial<LedgerEntry>>({
    entity_type: 'customer',
    entity_id: '',
    entity_name: '',
    transaction_type: 'debit',
    amount: 0,
    description: '',
    reference_id: '',
    reference_type: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  // Fetch data on mount
  useEffect(() => {
    fetchLedgerEntries();
    fetchCustomers();
    fetchVendors();
  }, []);

  // Calculate stats whenever ledger entries change
  useEffect(() => {
    calculateStats();
  }, [ledgerEntries]);

  // Filter ledger entries based on search term and filters
  useEffect(() => {
    let filtered = ledgerEntries;
    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(entry =>
        entry.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    // Entity type filter
    if (entityTypeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.entity_type === entityTypeFilter);
    }
    // Transaction type filter
    if (transactionTypeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.transaction_type === transactionTypeFilter);
    }
    setFilteredLedgerEntries(filtered);
  }, [ledgerEntries, searchTerm, entityTypeFilter, transactionTypeFilter]);

  // Fetch ledger entries for the authenticated user
  async function fetchLedgerEntries() {
    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast.error('Authentication Error', {
        description: 'Please log in to view ledger entries.',
      });
      router.push('/login');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to Fetch Ledger Entries', {
        description: error.message,
      });
    } else {
      setLedgerEntries(data || []);
    }
    setLoading(false);
  }

  // Fetch customers for selection
  async function fetchCustomers() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return;
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    if (!error) {
      setCustomers(data || []);
    }
  }

  // Fetch vendors for selection
  async function fetchVendors() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return;
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name');
    if (!error) {
      setVendors(data || []);
    }
  }

  // Calculate ledger statistics
  function calculateStats() {
    const totalDebits = ledgerEntries
      .filter(entry => entry.transaction_type === 'debit')
      .reduce((sum, entry) => sum + entry.amount, 0);
    const totalCredits = ledgerEntries
      .filter(entry => entry.transaction_type === 'credit')
      .reduce((sum, entry) => sum + entry.amount, 0);
    const netBalance = totalCredits - totalDebits;
    setStats({
      totalDebits,
      totalCredits,
      netBalance,
    });
  }

  // Handle entity selection
  function handleEntitySelect(entityId: string) {
    const selectedCustomer = customers.find(c => c.id === entityId);
    const selectedVendor = vendors.find(v => v.id === entityId);
    if (selectedCustomer) {
      setFormData({
        ...formData,
        entity_id: entityId,
        entity_name: selectedCustomer.name,
      });
    } else if (selectedVendor) {
      setFormData({
        ...formData,
        entity_id: entityId,
        entity_name: selectedVendor.name,
      });
    } else {
      setFormData({
        ...formData,
        entity_id: '',
        entity_name: '',
      });
    }
  }

  // Validate form data
  function validateForm(): boolean {
    if (!formData.entity_type) {
      toast.error('Validation Error', {
        description: 'Entity type is required.',
      });
      return false;
    }
    if (!formData.entity_id && !formData.entity_name?.trim()) {
      toast.error('Validation Error', {
        description: 'Entity selection or name is required.',
      });
      return false;
    }
    if (!formData.transaction_type) {
      toast.error('Validation Error', {
        description: 'Transaction type is required.',
      });
      return false;
    }
    if (!formData.amount || formData.amount <= 0) {
      toast.error('Validation Error', {
        description: 'Amount must be greater than zero.',
      });
      return false;
    }
    return true;
  }

  // Handle form submission for create/update
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast.error('Authentication Error', {
        description: 'Please log in to perform this action.',
      });
      setLoading(false);
      return;
    }
    const entryData = {
      user_id: user.id,
      entity_type: formData.entity_type || 'customer',
      entity_id: formData.entity_id || null,
      entity_name: formData.entity_name?.trim() || '',
      transaction_type: formData.transaction_type || 'debit',
      amount: Number(formData.amount) || 0,
      description: formData.description?.trim() || null,
      reference_id: formData.reference_id || null,
      reference_type: formData.reference_type?.trim() || null,
    };
    if (editingId) {
      // Update existing ledger entry
      const { error } = await supabase
        .from('ledger_entries')
        .update(entryData)
        .eq('id', editingId)
        .eq('user_id', user.id);
      if (error) {
        toast.error('Failed to Update Ledger Entry', {
          description: error.message,
        });
      } else {
        toast.success('Ledger Entry Updated', {
          description: `Ledger entry for ${formData.entity_name} has been successfully updated.`,
        });
        resetForm();
        fetchLedgerEntries();
      }
    } else {
      // Create new ledger entry
      const { error } = await supabase
        .from('ledger_entries')
        .insert(entryData);
      if (error) {
        toast.error('Failed to Create Ledger Entry', {
          description: error.message,
        });
      } else {
        toast.success('Ledger Entry Created', {
          description: `Ledger entry for ${formData.entity_name} has been successfully created.`,
        });
        resetForm();
        fetchLedgerEntries();
      }
    }
    setLoading(false);
  }

  // Reset form
  function resetForm() {
    setFormData({
      entity_type: 'customer',
      entity_id: '',
      entity_name: '',
      transaction_type: 'debit',
      amount: 0,
      description: '',
      reference_id: '',
      reference_type: '',
    });
    setEditingId(null);
  }

  // Handle edit button click
  function handleEdit(entry: LedgerEntry) {
    setFormData({
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || '',
      entity_name: entry.entity_name,
      transaction_type: entry.transaction_type,
      amount: entry.amount,
      description: entry.description || '',
      reference_id: entry.reference_id || '',
      reference_type: entry.reference_type || '',
    });
    setEditingId(entry.id);
  }

  // Handle delete with confirmation
  async function handleDelete(id: string) {
    const entry = ledgerEntries.find(e => e.id === id);
    if (!confirm(`Are you sure you want to delete the ledger entry for ${entry?.entity_name || 'this entity'}?`)) {
      return;
    }
    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast.error('Authentication Error', {
        description: 'Please log in to perform this action.',
      });
      setLoading(false);
      return;
    }
    const { error } = await supabase
      .from('ledger_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      toast.error('Failed to Delete Ledger Entry', {
        description: error.message,
      });
    } else {
      toast.success('Ledger Entry Deleted', {
        description: `Ledger entry for ${entry?.entity_name || 'entity'} has been successfully deleted.`,
      });
      fetchLedgerEntries();
    }
    setLoading(false);
  }

  // Format currency
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  // Format date
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Get transaction type badge
  function getTransactionTypeBadge(type: string) {
    if (type === 'debit') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <ArrowUpCircle className="h-3 w-3" />
          Debit
        </Badge>
      );
    } else {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <ArrowDownCircle className="h-3 w-3" />
          Credit
        </Badge>
      );
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Toaster richColors />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Book className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Ledger Entries Management</h1>
        </div>
        {/* Ledger Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Debits</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.totalDebits)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Credits</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.totalCredits)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Net Balance</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.netBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {editingId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {editingId ? 'Edit Ledger Entry' : 'Create New Ledger Entry'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Entity Type *</label>
                <Select
                  value={formData.entity_type || 'customer'}
                  onValueChange={(value: 'customer' | 'vendor') => setFormData({ ...formData, entity_type: value, entity_id: '', entity_name: '' })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Entity *</label>
                <Select
                  value={formData.entity_id || 'manual'}
                  onValueChange={handleEntitySelect}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity or enter manually" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Enter manually</SelectItem>
                    {formData.entity_type === 'customer'
                      ? customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))
                      : vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
                {(!formData.entity_id || formData.entity_id === 'manual') && (
                  <Input
                    placeholder="Entity Name *"
                    value={formData.entity_name || ''}
                    onChange={(e) => setFormData({ ...formData, entity_name: e.target.value })}
                    required
                    disabled={loading}
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Transaction Type *</label>
                <Select
                  value={formData.transaction_type || 'debit'}
                  onValueChange={(value: 'debit' | 'credit') => setFormData({ ...formData, transaction_type: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount *</label>
                <Input
                  placeholder="0.00"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) || 0 })}
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Enter description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Reference ID</label>
                <Input
                  placeholder="Enter reference ID (optional)"
                  value={formData.reference_id || ''}
                  onChange={(e) => setFormData({ ...formData, reference_id: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reference Type</label>
                <Input
                  placeholder="Enter reference type (optional)"
                  value={formData.reference_type || ''}
                  onChange={(e) => setFormData({ ...formData, reference_type: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Processing...' : (editingId ? 'Update Ledger Entry' : 'Create Ledger Entry')}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Ledger Entries List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <CardTitle>Ledger Entries ({filteredLedgerEntries.length})</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ledger entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                </SelectContent>
              </Select>
              <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredLedgerEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || entityTypeFilter !== 'all' || transactionTypeFilter !== 'all'
                ? 'No ledger entries found matching your filters.'
                : 'No ledger entries yet. Create your first ledger entry above.'
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLedgerEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.entity_name} ({entry.entity_type})</TableCell>
                      <TableCell>{entry.entity_type}</TableCell>
                      <TableCell>{getTransactionTypeBadge(entry.transaction_type)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(entry.amount)}</TableCell>
                      <TableCell>{entry.description || '-'}</TableCell>
                      <TableCell>{formatDate(entry.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                            disabled={loading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}