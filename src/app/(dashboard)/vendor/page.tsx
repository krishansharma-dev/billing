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
import { Search, Edit, Trash2, Plus, X, Building2 } from 'lucide-react';

type Vendor = Database['public']['Tables']['vendors']['Row'];

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Vendor>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    balance: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  // Fetch vendors on mount
  useEffect(() => {
    fetchVendors();
  }, []);

  // Filter vendors based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredVendors(vendors);
    } else {
      const filtered = vendors.filter(vendor => 
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.phone?.includes(searchTerm) ||
        vendor.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredVendors(filtered);
    }
  }, [vendors, searchTerm]);

  // Fetch vendors for the authenticated user
  async function fetchVendors() {
    setLoading(true);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast.error('Authentication Error', {
        description: 'Please log in to view vendors.',
      });
      router.push('/login');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to Fetch Vendors', {
        description: error.message,
      });
    } else {
      setVendors(data || []);
    }
    
    setLoading(false);
  }

  // Validate form data
  function validateForm(): boolean {
    if (!formData.name?.trim()) {
      toast.error('Validation Error', {
        description: 'Vendor name is required.',
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

    const vendorData = {
      ...formData,
      user_id: user.id,
      balance: Number(formData.balance) || 0,
      email: formData.email?.trim() || null,
      phone: formData.phone?.trim() || null,
      address: formData.address?.trim() || null,
      name: formData.name?.trim() || '',
    };

    if (editingId) {
      // Update existing vendor
      const { error } = await supabase
        .from('vendors')
        .update(vendorData)
        .eq('id', editingId)
        .eq('user_id', user.id);

      if (error) {
        toast.error('Failed to Update Vendor', {
          description: error.message,
        });
      } else {
        toast.success('Vendor Updated', {
          description: `${formData.name} has been successfully updated.`,
        });
        resetForm();
        fetchVendors();
      }
    } else {
      // Create new vendor
      const { error } = await supabase
        .from('vendors')
        .insert(vendorData);

      if (error) {
        toast.error('Failed to Create Vendor', {
          description: error.message,
        });
      } else {
        toast.success('Vendor Created', {
          description: `${formData.name} has been successfully created.`,
        });
        resetForm();
        fetchVendors();
      }
    }

    setLoading(false);
  }

  // Reset form
  function resetForm() {
    setFormData({ name: '', email: '', phone: '', address: '', balance: 0 });
    setEditingId(null);
  }

  // Handle edit button click
  function handleEdit(vendor: Vendor) {
    setFormData({
      name: vendor.name,
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      balance: vendor.balance || 0,
    });
    setEditingId(vendor.id);
  }

  // Handle delete with confirmation
  async function handleDelete(id: string) {
    const vendor = vendors.find(v => v.id === id);
    if (!confirm(`Are you sure you want to delete ${vendor?.name || 'this vendor'}?`)) {
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
      .from('vendors')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to Delete Vendor', {
        description: error.message,
      });
    } else {
      toast.success('Vendor Deleted', {
        description: `${vendor?.name || 'Vendor'} has been successfully deleted.`,
      });
      fetchVendors();
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
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Vendor Management</h1>
        </div>
        <p className="text-muted-foreground">Manage your vendors and supplier information.</p>
      </div>

      {/* Create/Edit Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {editingId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {editingId ? 'Edit Vendor' : 'Add New Vendor'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Vendor Name *"
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
              <Input
                placeholder="Current Balance"
                value={formData.balance || ''}
                onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) || 0 })}
                type="number"
                step="0.01"
                min="0"
                disabled={loading}
              />
            </div>
            <Input
              placeholder="Business Address"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={loading}
            />
            <div className="flex space-x-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Processing...' : (editingId ? 'Update Vendor' : 'Add Vendor')}
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

      {/* Vendors List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Vendors ({filteredVendors.length})</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
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
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No vendors found matching your search.' : 'No vendors yet. Add your first vendor above.'}
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
                    <TableHead>Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>{vendor.email || '-'}</TableCell>
                      <TableCell>{vendor.phone || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate" title={vendor.address || ''}>
                        {vendor.address || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getBalanceBadgeVariant(vendor.balance)}>
                          {formatBalance(vendor.balance)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(vendor)}
                            disabled={loading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(vendor.id)}
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