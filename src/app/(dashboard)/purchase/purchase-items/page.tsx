'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster, toast } from 'sonner';
import { createClient } from '@/lib/client';
import { Database } from '@/lib/types';
import { Search, Edit, Trash2, Plus, X, Package, DollarSign, Hash } from 'lucide-react';

type PurchaseItem = Database['public']['Tables']['purchase_items']['Row'];
type Purchase = Database['public']['Tables']['purchases']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

interface PurchaseItemsStats {
  totalItems: number;
  totalValue: number;
  avgPrice: number;
}

export default function PurchaseItemsPage() {
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredPurchaseItems, setFilteredPurchaseItems] = useState<PurchaseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [purchaseFilter, setPurchaseFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<PurchaseItemsStats>({
    totalItems: 0,
    totalValue: 0,
    avgPrice: 0,
  });
  const [formData, setFormData] = useState<Partial<PurchaseItem>>({
    purchase_id: '',
    product_id: '',
    product_name: '',
    quantity: 1,
    price: 0,
    total: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  // Fetch data on mount
  useEffect(() => {
    fetchPurchaseItems();
    fetchPurchases();
    fetchProducts();
  }, []);

  // Calculate stats whenever purchase items change
  useEffect(() => {
    calculateStats();
  }, [purchaseItems]);

  // Filter purchase items based on search term and purchase filter
  useEffect(() => {
    let filtered = purchaseItems;
    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(item =>
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    // Purchase filter
    if (purchaseFilter !== 'all') {
      filtered = filtered.filter(item => item.purchase_id === purchaseFilter);
    }
    setFilteredPurchaseItems(filtered);
  }, [purchaseItems, searchTerm, purchaseFilter]);

  // Calculate total when quantity or price changes
  useEffect(() => {
    const quantity = Number(formData.quantity) || 0;
    const price = Number(formData.price) || 0;
    const total = quantity * price;
    if (formData.total !== total) {
      setFormData(prev => ({ ...prev, total }));
    }
  }, [formData.quantity, formData.price]);

  // Fetch purchase items for the authenticated user
  async function fetchPurchaseItems() {
    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast.error('Authentication Error', {
        description: 'Please log in to view purchase items.',
      });
      router.push('/login');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('purchase_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to Fetch Purchase Items', {
        description: error.message,
      });
    } else {
      setPurchaseItems(data || []);
    }
    setLoading(false);
  }

  // Fetch purchases for selection
  async function fetchPurchases() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return;
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) {
      setPurchases(data || []);
    }
  }

  // Fetch products for selection
  async function fetchProducts() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    if (!error) {
      setProducts(data || []);
    }
  }

  // Calculate purchase items statistics
  function calculateStats() {
    const totalItems = purchaseItems.length;
    const totalValue = purchaseItems.reduce((sum, item) => sum + item.total, 0);
    const avgPrice = totalItems > 0 ? totalValue / totalItems : 0;
    setStats({
      totalItems,
      totalValue,
      avgPrice,
    });
  }

  // Handle product selection
  function handleProductSelect(productId: string) {
    const selectedProduct = products.find(p => p.id === productId);
    if (selectedProduct) {
      setFormData({
        ...formData,
        product_id: productId,
        product_name: selectedProduct.name,
        price: selectedProduct.price || 0,
      });
    } else {
      setFormData({
        ...formData,
        product_id: '',
        product_name: '',
        price: 0,
      });
    }
  }

  // Validate form data
  function validateForm(): boolean {
    if (!formData.purchase_id) {
      toast.error('Validation Error', {
        description: 'Purchase selection is required.',
      });
      return false;
    }
    if (!formData.product_name?.trim()) {
      toast.error('Validation Error', {
        description: 'Product name is required.',
      });
      return false;
    }
    if (!formData.quantity || formData.quantity <= 0) {
      toast.error('Validation Error', {
        description: 'Quantity must be greater than zero.',
      });
      return false;
    }
    if (!formData.price || formData.price <= 0) {
      toast.error('Validation Error', {
        description: 'Price must be greater than zero.',
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
    const itemData = {
      purchase_id: formData.purchase_id,
      product_id: formData.product_id || null,
      product_name: formData.product_name?.trim() || '',
      quantity: Number(formData.quantity) || 1,
      price: Number(formData.price) || 0,
      total: Number(formData.total) || 0,
    };
    if (editingId) {
      // Update existing purchase item
      const { error } = await supabase
        .from('purchase_items')
        .update(itemData)
        .eq('id', editingId);
      if (error) {
        toast.error('Failed to Update Purchase Item', {
          description: error.message,
        });
      } else {
        toast.success('Purchase Item Updated', {
          description: `Purchase item ${formData.product_name} has been successfully updated.`,
        });
        resetForm();
        fetchPurchaseItems();
      }
    } else {
      // Create new purchase item
      const { error } = await supabase
        .from('purchase_items')
        .insert(itemData);
      if (error) {
        toast.error('Failed to Create Purchase Item', {
          description: error.message,
        });
      } else {
        toast.success('Purchase Item Created', {
          description: `Purchase item ${formData.product_name} has been successfully created.`,
        });
        resetForm();
        fetchPurchaseItems();
      }
    }
    setLoading(false);
  }

  // Reset form
  function resetForm() {
    setFormData({
      purchase_id: '',
      product_id: '',
      product_name: '',
      quantity: 1,
      price: 0,
      total: 0,
    });
    setEditingId(null);
  }

  // Handle edit button click
  function handleEdit(item: PurchaseItem) {
    setFormData({
      purchase_id: item.purchase_id,
      product_id: item.product_id || '',
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
    });
    setEditingId(item.id);
  }

  // Handle delete with confirmation
  async function handleDelete(id: string) {
    const item = purchaseItems.find(i => i.id === id);
    if (!confirm(`Are you sure you want to delete the purchase item ${item?.product_name || 'this item'}?`)) {
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
      .from('purchase_items')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Failed to Delete Purchase Item', {
        description: error.message,
      });
    } else {
      toast.success('Purchase Item Deleted', {
        description: `Purchase item ${item?.product_name || 'item'} has been successfully deleted.`,
      });
      fetchPurchaseItems();
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

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Toaster richColors />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Package className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Purchase Items Management</h1>
        </div>
        {/* Purchase Items Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                  <p className="text-xl font-bold">{stats.totalItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.totalValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Price</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.avgPrice)}</p>
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
            {editingId ? 'Edit Purchase Item' : 'Create New Purchase Item'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Purchase *</label>
                <Select
                  value={formData.purchase_id || ''}
                  onValueChange={(value) => setFormData({ ...formData, purchase_id: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purchase" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchases.map((purchase) => (
                      <SelectItem key={purchase.id} value={purchase.id}>
                        {purchase.vendor_name} - {new Date(purchase.purchase_date).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Product *</label>
                <Select
                  value={formData.product_id || 'manual'}
                  onValueChange={handleProductSelect}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product or enter manually" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Enter manually</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!formData.product_id || formData.product_id === 'manual') && (
                  <Input
                    placeholder="Product Name *"
                    value={formData.product_name || ''}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    required
                    disabled={loading}
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity *</label>
                <Input
                  placeholder="1"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) || 1 })}
                  type="number"
                  min="1"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price *</label>
                <Input
                  placeholder="0.00"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
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
            <div className="flex space-x-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Processing...' : (editingId ? 'Update Purchase Item' : 'Create Purchase Item')}
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

      {/* Purchase Items List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <CardTitle>Purchase Items ({filteredPurchaseItems.length})</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search purchase items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={purchaseFilter} onValueChange={setPurchaseFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by Purchase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Purchases</SelectItem>
                  {purchases.map((purchase) => (
                    <SelectItem key={purchase.id} value={purchase.id}>
                      {purchase.vendor_name} - {new Date(purchase.purchase_date).toLocaleDateString()}
                    </SelectItem>
                  ))}
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
          ) : filteredPurchaseItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || purchaseFilter !== 'all'
                ? 'No purchase items found matching your filters.'
                : 'No purchase items yet. Create your first purchase item above.'
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Purchase</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchaseItems.map((item) => {
                    const purchase = purchases.find(p => p.id === item.purchase_id);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {purchase ? `${purchase.vendor_name} - ${new Date(purchase.purchase_date).toLocaleDateString()}` : 'Unknown Purchase'}
                        </TableCell>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.price)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(item.total)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              disabled={loading}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}