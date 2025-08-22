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
import { Search, Edit, Trash2, Plus, X, Receipt, DollarSign, Calendar, Clock, CheckCircle, TrendingUp } from 'lucide-react';

type Purchase = Database['public']['Tables']['purchases']['Row'];
type Vendor = Database['public']['Tables']['vendors']['Row'];

interface PurchasesStats {
  totalPurchases: number;
  todayPurchases: number;
  pendingAmount: number;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<PurchasesStats>({
    totalPurchases: 0,
    todayPurchases: 0,
    pendingAmount: 0,
  });
  const [formData, setFormData] = useState<Partial<Purchase>>({
    vendor_id: '',
    vendor_name: '',
    purchase_date: new Date().toISOString().split('T')[0],
    subtotal: 0,
    tax: 0,
    total: 0,
    status: 'pending',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  // Fetch data on mount
  useEffect(() => {
    fetchPurchases();
    fetchVendors();
  }, []);

  // Calculate stats whenever purchases change
  useEffect(() => {
    calculateStats();
  }, [purchases]);

  // Filter purchases based on search term and filters
  useEffect(() => {
    let filtered = purchases;
    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(purchase =>
        purchase.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(purchase => purchase.status === statusFilter);
    }
    // Date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      const filterDate = new Date(today);
      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(purchase =>
            new Date(purchase.purchase_date).toDateString() === today.toDateString()
          );
          break;
        case 'week':
          filterDate.setDate(today.getDate() - 7);
          filtered = filtered.filter(purchase =>
            new Date(purchase.purchase_date) >= filterDate
          );
          break;
        case 'month':
          filterDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter(purchase =>
            new Date(purchase.purchase_date) >= filterDate
          );
          break;
      }
    }
    setFilteredPurchases(filtered);
  }, [purchases, searchTerm, statusFilter, dateFilter]);

  // Calculate total when subtotal or tax changes
  useEffect(() => {
    const subtotal = Number(formData.subtotal) || 0;
    const tax = Number(formData.tax) || 0;
    const total = subtotal + tax;
    if (formData.total !== total) {
      setFormData(prev => ({ ...prev, total }));
    }
  }, [formData.subtotal, formData.tax]);

  // Fetch purchases for the authenticated user
  async function fetchPurchases() {
    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast.error('Authentication Error', {
        description: 'Please log in to view purchases.',
      });
      router.push('/login');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to Fetch Purchases', {
        description: error.message,
      });
    } else {
      setPurchases(data || []);
    }
    setLoading(false);
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

  // Calculate purchases statistics
  function calculateStats() {
    const today = new Date().toDateString();
    const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.total, 0);
    const todayPurchases = purchases
      .filter(purchase => new Date(purchase.purchase_date).toDateString() === today)
      .reduce((sum, purchase) => sum + purchase.total, 0);
    const pendingAmount = purchases
      .filter(purchase => purchase.status === 'pending')
      .reduce((sum, purchase) => sum + purchase.total, 0);
    setStats({
      totalPurchases,
      todayPurchases,
      pendingAmount,
    });
  }

  // Handle vendor selection
  function handleVendorSelect(vendorId: string) {
    const selectedVendor = vendors.find(v => v.id === vendorId);
    if (selectedVendor) {
      setFormData({
        ...formData,
        vendor_id: vendorId,
        vendor_name: selectedVendor.name,
      });
    } else {
      setFormData({
        ...formData,
        vendor_id: '',
        vendor_name: '',
      });
    }
  }

  // Validate form data
  function validateForm(): boolean {
    if (!formData.vendor_name?.trim()) {
      toast.error('Validation Error', {
        description: 'Vendor name is required.',
      });
      return false;
    }
    if (!formData.subtotal || formData.subtotal <= 0) {
      toast.error('Validation Error', {
        description: 'Subtotal must be greater than zero.',
      });
      return false;
    }
    if (formData.tax !== undefined && formData.tax < 0) {
      toast.error('Validation Error', {
        description: 'Tax cannot be negative.',
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
    const purchaseData = {
      user_id: user.id,
      vendor_id: formData.vendor_id || null,
      vendor_name: formData.vendor_name?.trim() || '',
      purchase_date: formData.purchase_date,
      subtotal: Number(formData.subtotal) || 0,
      tax: Number(formData.tax) || 0,
      total: Number(formData.total) || 0,
      status: formData.status || 'pending',
    };
    if (editingId) {
      // Update existing purchase
      const { error } = await supabase
        .from('purchases')
        .update(purchaseData)
        .eq('id', editingId)
        .eq('user_id', user.id);
      if (error) {
        toast.error('Failed to Update Purchase', {
          description: error.message,
        });
      } else {
        toast.success('Purchase Updated', {
          description: `Purchase from ${formData.vendor_name} has been successfully updated.`,
        });
        resetForm();
        fetchPurchases();
      }
    } else {
      // Create new purchase
      const { error } = await supabase
        .from('purchases')
        .insert(purchaseData);
      if (error) {
        toast.error('Failed to Create Purchase', {
          description: error.message,
        });
      } else {
        toast.success('Purchase Created', {
          description: `Purchase from ${formData.vendor_name} has been successfully created.`,
        });
        resetForm();
        fetchPurchases();
      }
    }
    setLoading(false);
  }

  // Reset form
  function resetForm() {
    setFormData({
      vendor_id: '',
      vendor_name: '',
      purchase_date: new Date().toISOString().split('T')[0],
      subtotal: 0,
      tax: 0,
      total: 0,
      status: 'pending',
    });
    setEditingId(null);
  }

  // Handle edit button click
  function handleEdit(purchase: Purchase) {
    setFormData({
      vendor_id: purchase.vendor_id || '',
      vendor_name: purchase.vendor_name,
      purchase_date: purchase.purchase_date,
      subtotal: purchase.subtotal,
      tax: purchase.tax,
      total: purchase.total,
      status: purchase.status,
    });
    setEditingId(purchase.id);
  }

  // Handle delete with confirmation
  async function handleDelete(id: string) {
    const purchase = purchases.find(p => p.id === id);
    if (!confirm(`Are you sure you want to delete the purchase from ${purchase?.vendor_name || 'this vendor'}?`)) {
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
      .from('purchases')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      toast.error('Failed to Delete Purchase', {
        description: error.message,
      });
    } else {
      toast.success('Purchase Deleted', {
        description: `Purchase from ${purchase?.vendor_name || 'vendor'} has been successfully deleted.`,
      });
      fetchPurchases();
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

  // Get status badge
  function getStatusBadge(status: string) {
    if (status === 'paid') {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Paid
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
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
          <Receipt className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Purchases Management</h1>
        </div>
        {/* Purchases Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Purchases</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.totalPurchases)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Purchases</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.todayPurchases)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.pendingAmount)}</p>
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
            {editingId ? 'Edit Purchase' : 'Create New Purchase'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Vendor *</label>
                <Select
                  value={formData.vendor_id || 'manual'}
                  onValueChange={handleVendorSelect}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor or enter manually" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Enter manually</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!formData.vendor_id || formData.vendor_id === 'manual') && (
                  <Input
                    placeholder="Vendor Name *"
                    value={formData.vendor_name || ''}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    required
                    disabled={loading}
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Purchase Date</label>
                <Input
                  type="date"
                  value={formData.purchase_date || ''}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subtotal *</label>
                <Input
                  placeholder="0.00"
                  value={formData.subtotal || ''}
                  onChange={(e) => setFormData({ ...formData, subtotal: Number(e.target.value) || 0 })}
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tax</label>
                <Input
                  placeholder="0.00"
                  value={formData.tax || ''}
                  onChange={(e) => setFormData({ ...formData, tax: Number(e.target.value) || 0 })}
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total</label>
                <Input
                  value={formatCurrency(formData.total || 0)}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={formData.status || 'pending'}
                onValueChange={(value: 'paid' | 'pending') => setFormData({ ...formData, status: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Processing...' : (editingId ? 'Update Purchase' : 'Create Purchase')}
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

      {/* Purchases List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <CardTitle>Purchases ({filteredPurchases.length})</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search purchases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
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
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'No purchases found matching your filters.'
                : 'No purchases yet. Create your first purchase above.'
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium">{purchase.vendor_name}</TableCell>
                      <TableCell>{formatDate(purchase.purchase_date)}</TableCell>
                      <TableCell>{formatCurrency(purchase.subtotal)}</TableCell>
                      <TableCell>{formatCurrency(purchase.tax)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(purchase.total)}</TableCell>
                      <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(purchase)}
                            disabled={loading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(purchase.id)}
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