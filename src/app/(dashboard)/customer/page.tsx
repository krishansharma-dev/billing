'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Toaster, toast } from 'sonner';
import { createClient } from '@/lib/client';
import { Database } from '@/lib/types';
import { Search, Edit, Trash2, Plus, X } from 'lucide-react';

type Customer = Database['public']['Tables']['customers']['Row'];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    email: '',
    phone: '',
    address: '',

  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  // Fetch customers on mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer => 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [customers, searchTerm]);

  // Fetch customers for the authenticated user
  async function fetchCustomers() {
    setLoading(true);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast.error('Authentication Error', {
        description: 'Please log in to view customers.',
      });
      router.push('/login');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to Fetch Customers', {
        description: error.message,
      });
    } else {
      setCustomers(data || []);
    }
    
    setLoading(false);
  }

  // Validate form data
  function validateForm(): boolean {
    if (!formData.name?.trim()) {
      toast.error('Validation Error', {
        description: 'Customer name is required.',
      });
      return false;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Validation Error', {
        description: 'Please enter a valid email address.',
      });
      return false;
    }

    if (formData.balance && formData.balance < 0) {
      toast.error('Validation Error', {
        description: 'Balance cannot be negative.',
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

    const customerData = {
      ...formData,
      user_id: user.id,
     
      email: formData.email?.trim() || null,
      phone: formData.phone?.trim() || null,
      address: formData.address?.trim() || null,
      name: formData.name?.trim() || '',
    };

    if (editingId) {
      // Update existing customer
      const { error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', editingId)
        .eq('user_id', user.id);

      if (error) {
        toast.error('Failed to Update Customer', {
          description: error.message,
        });
      } else {
        toast.success('Customer Updated', {
          description: `${formData.name} has been successfully updated.`,
        });
        resetForm();
        fetchCustomers();
      }
    } else {
      // Create new customer
      const { error } = await supabase
        .from('customers')
        .insert(customerData);

      if (error) {
        toast.error('Failed to Create Customer', {
          description: error.message,
        });
      } else {
        toast.success('Customer Created', {
          description: `${formData.name} has been successfully created.`,
        });
        resetForm();
        fetchCustomers();
      }
    }

    setLoading(false);
  }

  // Reset form
  function resetForm() {
    setFormData({ name: '', email: '', phone: '', address: ''});
    setEditingId(null);
  }

  // Handle edit button click
  function handleEdit(customer: Customer) {
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
    //   balance: customer.balance || 0,
    });
    setEditingId(customer.id);
  }

  // Handle delete with confirmation
  async function handleDelete(id: string) {
    const customer = customers.find(c => c.id === id);
    if (!confirm(`Are you sure you want to delete ${customer?.name || 'this customer'}?`)) {
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
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to Delete Customer', {
        description: error.message,
      });
    } else {
      toast.success('Customer Deleted', {
        description: `${customer?.name || 'Customer'} has been successfully deleted.`,
      });
      fetchCustomers();
    }

    setLoading(false);
  }

  // Format balance display
  function formatBalance(balance: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(balance);
  }

  // Get balance badge variant
  function getBalanceBadgeVariant(balance: number): "default" | "destructive" | "secondary" {
    if (balance < 0) return "destructive";
    if (balance === 0) return "secondary";
    return "default";
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Toaster richColors />
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Customer Management</h1>
        <p className="text-muted-foreground">Manage your customers and their information.</p>
      </div>

      {/* Create/Edit Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {editingId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {editingId ? 'Edit Customer' : 'Create New Customer'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Customer Name *"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
              <Input
                placeholder="Email Address"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                type="email"
                disabled={loading}
              />
              <Input
                placeholder="Phone Number"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={loading}
              />
              {/* <Input
                placeholder="Initial Balance"
                value={formData.balance || ''}
                onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) || 0 })}
                type="number"
                step="0.01"
                min="0"
                disabled={loading}
              /> */}
            </div>
            <Input
              placeholder="Address"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={loading}
            />
            <div className="flex space-x-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Processing...' : (editingId ? 'Update Customer' : 'Create Customer')}
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

      {/* Customers List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No customers found matching your search.' : 'No customers yet. Create your first customer above.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.email || '-'}</TableCell>
                      <TableCell>{customer.phone || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate" title={customer.address || ''}>
                        {customer.address || '-'}
                      </TableCell>
                     
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(customer)}
                            disabled={loading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(customer.id)}
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