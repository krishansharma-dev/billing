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
import { Search, Edit, Trash2, Plus, X, Package, AlertTriangle, CheckCircle } from 'lucide-react';

type Product = Database['public']['Tables']['products']['Row'];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: '',
    quantity: 0,
    price: 0,
    min_stock: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  // Get unique categories from products
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter products based on search term, category, and stock status
  useEffect(() => {
    let filtered = products;

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    // Stock filter
    if (stockFilter === 'low') {
      filtered = filtered.filter(product => product.quantity <= product.min_stock);
    } else if (stockFilter === 'out') {
      filtered = filtered.filter(product => product.quantity === 0);
    } else if (stockFilter === 'instock') {
      filtered = filtered.filter(product => product.quantity > product.min_stock);
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, categoryFilter, stockFilter]);

  // Fetch products for the authenticated user
  async function fetchProducts() {
    setLoading(true);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast.error('Authentication Error', {
        description: 'Please log in to view products.',
      });
      router.push('/login');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to Fetch Products', {
        description: error.message,
      });
    } else {
      setProducts(data || []);
    }
    
    setLoading(false);
  }

  // Validate form data
  function validateForm(): boolean {
    if (!formData.name?.trim()) {
      toast.error('Validation Error', {
        description: 'Product name is required.',
      });
      return false;
    }

    if (!formData.category?.trim()) {
      toast.error('Validation Error', {
        description: 'Category is required.',
      });
      return false;
    }

    if (!formData.price || formData.price <= 0) {
      toast.error('Validation Error', {
        description: 'Price must be greater than zero.',
      });
      return false;
    }

    if (formData.quantity !== undefined && formData.quantity < 0) {
      toast.error('Validation Error', {
        description: 'Quantity cannot be negative.',
      });
      return false;
    }

    if (formData.min_stock !== undefined && formData.min_stock < 0) {
      toast.error('Validation Error', {
        description: 'Minimum stock cannot be negative.',
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

    const productData = {
      ...formData,
      user_id: user.id,
      name: formData.name?.trim() || '',
      category: formData.category?.trim() || '',
      quantity: Number(formData.quantity) || 0,
      price: Number(formData.price) || 0,
      min_stock: Number(formData.min_stock) || 0,
    };

    if (editingId) {
      // Update existing product
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingId)
        .eq('user_id', user.id);

      if (error) {
        toast.error('Failed to Update Product', {
          description: error.message,
        });
      } else {
        toast.success('Product Updated', {
          description: `${formData.name} has been successfully updated.`,
        });
        resetForm();
        fetchProducts();
      }
    } else {
      // Create new product
      const { error } = await supabase
        .from('products')
        .insert(productData);

      if (error) {
        toast.error('Failed to Create Product', {
          description: error.message,
        });
      } else {
        toast.success('Product Created', {
          description: `${formData.name} has been successfully created.`,
        });
        resetForm();
        fetchProducts();
      }
    }

    setLoading(false);
  }

  // Reset form
  function resetForm() {
    setFormData({ name: '', category: '', quantity: 0, price: 0, min_stock: 0 });
    setEditingId(null);
  }

  // Handle edit button click
  function handleEdit(product: Product) {
    setFormData({
      name: product.name,
      category: product.category,
      quantity: product.quantity,
      price: product.price,
      min_stock: product.min_stock,
    });
    setEditingId(product.id);
  }

  // Handle delete with confirmation
  async function handleDelete(id: string) {
    const product = products.find(p => p.id === id);
    if (!confirm(`Are you sure you want to delete ${product?.name || 'this product'}?`)) {
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
      .from('products')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to Delete Product', {
        description: error.message,
      });
    } else {
      toast.success('Product Deleted', {
        description: `${product?.name || 'Product'} has been successfully deleted.`,
      });
      fetchProducts();
    }

    setLoading(false);
  }

  // Format price display
  function formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }

  // Get stock status badge
  function getStockBadge(quantity: number, minStock: number) {
    if (quantity === 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <X className="h-3 w-3" />
          Out of Stock
        </Badge>
      );
    } else if (quantity <= minStock) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Low Stock
        </Badge>
      );
    } else {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          In Stock
        </Badge>
      );
    }
  }

  // Get stock alerts count
  const stockAlerts = products.filter(p => p.quantity <= p.min_stock);
  const outOfStock = products.filter(p => p.quantity === 0);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Toaster richColors />
      
      {/* Header with Stock Alerts */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Package className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Product Management</h1>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Manage your inventory and product catalog.</p>
          <div className="flex gap-2">
            {outOfStock.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {outOfStock.length} Out of Stock
              </Badge>
            )}
            {stockAlerts.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {stockAlerts.length} Low Stock Alert{stockAlerts.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {editingId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {editingId ? 'Edit Product' : 'Add New Product'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Product Name *"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
              <Input
                placeholder="Category *"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                disabled={loading}
              />
              <Input
                placeholder="Price *"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
                type="number"
                step="0.01"
                min="0.01"
                required
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Current Quantity"
                value={formData.quantity || ''}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) || 0 })}
                type="number"
                min="0"
                disabled={loading}
              />
              <Input
                placeholder="Minimum Stock Level"
                value={formData.min_stock || ''}
                onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) || 0 })}
                type="number"
                min="0"
                disabled={loading}
              />
            </div>
            <div className="flex space-x-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Processing...' : (editingId ? 'Update Product' : 'Add Product')}
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

      {/* Products List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <CardTitle>Products ({filteredProducts.length})</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="instock">In Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
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
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || categoryFilter !== 'all' || stockFilter !== 'all' 
                ? 'No products found matching your filters.' 
                : 'No products yet. Add your first product above.'
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Min Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id} className={product.quantity === 0 ? 'bg-red-50' : product.quantity <= product.min_stock ? 'bg-yellow-50' : ''}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{formatPrice(product.price)}</TableCell>
                      <TableCell>{product.quantity}</TableCell>
                      <TableCell>{product.min_stock}</TableCell>
                      <TableCell>
                        {getStockBadge(product.quantity, product.min_stock)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                            disabled={loading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
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