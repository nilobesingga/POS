import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  
  // Form state for new user
  const [newUser, setNewUser] = useState<Partial<InsertUser>>({
    username: "",
    password: "",
    displayName: "",
    role: "cashier"
  });
  
  // Query users
  const { 
    data: users, 
    isLoading: isLoadingUsers,
    isError: isUsersError 
  } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      try {
        // For demo, return mock users since we don't have a /users endpoint
        return [
          { id: 1, username: "admin", displayName: "Admin User", role: "admin" },
          { id: 2, username: "cashier", displayName: "John Smith", role: "cashier" }
        ];
      } catch (error) {
        throw new Error("Failed to fetch users");
      }
    }
  });
  
  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (user: InsertUser) => {
      // This would normally be an API call
      // const response = await apiRequest("POST", "/api/users", user);
      // return response.json();
      
      // For demo purposes
      return { id: 3, ...user };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddUserDialogOpen(false);
      resetUserForm();
      toast({
        title: "User Added",
        description: "The user has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add user",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });
  
  // Handle user form change
  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Reset user form
  const resetUserForm = () => {
    setNewUser({
      username: "",
      password: "",
      displayName: "",
      role: "cashier"
    });
  };
  
  // Handle user form submission
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!newUser.username || !newUser.password || !newUser.displayName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Submit form
    addUserMutation.mutate(newUser as InsertUser);
  };
  
  // Tax settings state
  const [taxRate, setTaxRate] = useState("8.25");
  
  const handleTaxRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTaxRate(e.target.value);
  };
  
  const handleSaveTaxRate = () => {
    toast({
      title: "Tax Rate Updated",
      description: `Tax rate has been updated to ${taxRate}%`
    });
  };
  
  // Store information state
  const [storeInfo, setStoreInfo] = useState({
    name: "Café Loyverse",
    address: "123 Main Street",
    city: "City",
    state: "State",
    zipCode: "12345",
    phone: "(123) 456-7890"
  });
  
  const handleStoreInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStoreInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSaveStoreInfo = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Store Information Updated",
      description: "Your store information has been updated successfully"
    });
  };
  
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="store">Store Information</TabsTrigger>
          <TabsTrigger value="taxes">Taxes</TabsTrigger>
          <TabsTrigger value="receipts">Receipt Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">User Management</h2>
            <Button onClick={() => setIsAddUserDialogOpen(true)}>
              Add User
            </Button>
          </div>
          
          {isLoadingUsers ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {Array(3).fill(0).map((_, index) => (
                <Card key={index}>
                  <CardHeader className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Skeleton className="h-5 w-1/2 mb-2" />
                    <div className="flex justify-end">
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isUsersError ? (
            <div className="text-center py-10">
              <p className="text-red-500">Failed to load users. Please try again.</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {users && users.map((user: any) => (
                <Card key={user.id}>
                  <CardHeader className="p-4">
                    <CardTitle>{user.displayName}</CardTitle>
                    <p className="text-sm text-gray-500">{user.username}</p>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm mb-4">Role: <span className="font-medium capitalize">{user.role}</span></p>
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Add User Dialog */}
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleAddUser}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username*</Label>
                      <Input
                        id="username"
                        name="username"
                        value={newUser.username}
                        onChange={handleUserChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name*</Label>
                      <Input
                        id="displayName"
                        name="displayName"
                        value={newUser.displayName}
                        onChange={handleUserChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password*</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={newUser.password}
                      onChange={handleUserChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      name="role"
                      value={newUser.role}
                      onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="cashier">Cashier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addUserMutation.isPending}>
                    {addUserMutation.isPending ? "Adding..." : "Add User"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveStoreInfo}>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Store Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={storeInfo.name}
                      onChange={handleStoreInfoChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={storeInfo.address}
                      onChange={handleStoreInfoChange}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        name="city"
                        value={storeInfo.city}
                        onChange={handleStoreInfoChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        name="state"
                        value={storeInfo.state}
                        onChange={handleStoreInfoChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        name="zipCode"
                        value={storeInfo.zipCode}
                        onChange={handleStoreInfoChange}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={storeInfo.phone}
                      onChange={handleStoreInfoChange}
                    />
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button type="submit">Save Changes</Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="taxes">
          <Card>
            <CardHeader>
              <CardTitle>Tax Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="taxRate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={handleTaxRateChange}
                      className="max-w-xs"
                    />
                    <Button onClick={handleSaveTaxRate}>Save</Button>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-6">
                  <h3 className="font-medium text-lg mb-4">Tax Categories</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    You can set up different tax categories for different types of products.
                  </p>
                  
                  <Button variant="outline" className="mt-2">
                    Add Tax Category
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="receipts">
          <Card>
            <CardHeader>
              <CardTitle>Receipt Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <div>
                    <h3 className="font-medium">Show Logo on Receipt</h3>
                    <p className="text-sm text-gray-500">Display your store logo at the top of receipts</p>
                  </div>
                  <div>
                    <Select defaultValue="yes">
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <div>
                    <h3 className="font-medium">Show Cashier Name</h3>
                    <p className="text-sm text-gray-500">Display the cashier's name on receipts</p>
                  </div>
                  <div>
                    <Select defaultValue="yes">
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <div>
                    <h3 className="font-medium">Receipt Footer Text</h3>
                    <p className="text-sm text-gray-500">Add a custom message at the bottom of receipts</p>
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pb-4">
                  <div>
                    <h3 className="font-medium">Email Receipt Template</h3>
                    <p className="text-sm text-gray-500">Customize how email receipts look</p>
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      Customize
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
