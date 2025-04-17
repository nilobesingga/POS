import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";
import { Customer, insertCustomerSchema } from "../../../shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type CustomerFormData = z.infer<typeof insertCustomerSchema>;

export default function CustomersPage() {
    const queryClient = useQueryClient();
    const [fileInput, setFileInput] = useState<File | null>(null);
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const form = useForm<CustomerFormData>({
        resolver: zodResolver(insertCustomerSchema),
        defaultValues: {
            customerName: "",
            email: null,
            phone: null,
            address: null,
            city: null,
            province: null,
            postalCode: null,
            country: null,
            customerCode: null,
            pointsBalance: 0,
            note: null
        }
    });

    const { data: customers, isError, isLoading } = useQuery<Customer[]>({
        queryKey: ["customers"],
        queryFn: async () => {
            const response = await fetch("/api/customers");
            if (!response.ok) {
                throw new Error('Failed to fetch customers');
            }
            return response.json();
        }
    });

    const importMutation = useMutation({
        mutationFn: async (file: File) => {
            const text = await file.text();
            const response = await fetch("/api/customers/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file: text }),
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to import customers');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            toast({
                title: "Success",
                description: "Customers imported successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to import customers",
                variant: "destructive",
            });
        }
    });

    const createCustomerMutation = useMutation({
        mutationFn: async (data: CustomerFormData) => {
            const response = await fetch("/api/customers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error('Failed to create customer');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            setIsFormOpen(false);
            form.reset();
            toast({
                title: "Success",
                description: "Customer created successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create customer",
                variant: "destructive",
            });
        }
    });

    const updateCustomerMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<CustomerFormData> }) => {
            const response = await fetch(`/api/customers/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error('Failed to update customer');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            setIsFormOpen(false);
            setSelectedCustomer(null);
            form.reset();
            toast({
                title: "Success",
                description: "Customer updated successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update customer",
                variant: "destructive",
            });
        }
    });

    const deleteCustomerMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await fetch(`/api/customers/${id}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                throw new Error('Failed to delete customer');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            toast({
                title: "Success",
                description: "Customer deleted successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete customer",
                variant: "destructive",
            });
        }
    });

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            toast({
                title: "Error",
                description: "No file selected",
                variant: "destructive",
            });
            return;
        }
        importMutation.mutate(file);
    };

    const handleExport = async () => {
        try {
            const response = await fetch("/api/customers/export");
            if (!response.ok) {
                throw new Error('Failed to export customers');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "customers.csv";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to export customers",
                variant: "destructive",
            });
        }
    };

    const onSubmit = (data: CustomerFormData) => {
        if (selectedCustomer) {
            updateCustomerMutation.mutate({ id: selectedCustomer.id, data });
        } else {
            createCustomerMutation.mutate(data);
        }
    };

    const handleEdit = (customer: Customer) => {
        setSelectedCustomer(customer);
        form.reset({
            customerName: customer.customerName,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            province: customer.province,
            postalCode: customer.postalCode,
            country: customer.country,
            customerCode: customer.customerCode,
            pointsBalance: Number(customer.pointsBalance),
            note: customer.note
        });
        setIsFormOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this customer?")) {
            deleteCustomerMutation.mutate(id);
        }
    };

    const handleAdd = () => {
        setSelectedCustomer(null);
        form.reset();
        setIsFormOpen(true);
    };

    // Filter customers based on search query
    const filteredCustomers = customers?.filter((customer) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            customer.customerName.toLowerCase().includes(searchLower) ||
            (customer.email?.toLowerCase() || "").includes(searchLower) ||
            (customer.phone?.toLowerCase() || "").includes(searchLower) ||
            (customer.customerCode?.toLowerCase() || "").includes(searchLower)
        );
    }) || [];

    // Calculate pagination
    const totalItems = filteredCustomers.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredCustomers.slice(startIndex, endIndex);

    // Handle page change
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    if (isLoading) {
        return (
            <div className="container mx-auto py-10">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Customers</h1>
                </div>
                <div className="border rounded-lg p-4">
                    Loading...
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="container mx-auto py-10">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Customers</h1>
                </div>
                <div className="border rounded-lg p-4 text-red-500">
                    Failed to load customers. Please try again later.
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 overflow-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h1 className="text-2xl font-bold">Customers</h1>
                <div className="flex gap-4">
                    <Button
                        variant="outline"
                        onClick={() => document.getElementById("importFile")?.click()}
                        disabled={importMutation.isPending}
                    >
                        {importMutation.isPending ? "Importing..." : "Import CSV"}
                    </Button>
                    <input
                        id="importFile"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleImport}
                        disabled={importMutation.isPending}
                    />
                    <Button onClick={handleExport}>Export CSV</Button>
                    <Button onClick={handleAdd}>Add Customer</Button>
                </div>
            </div>

            <div className="flex justify-between items-center mb-4">
                <div className="relative w-72">
                    <Input
                        placeholder="Search customers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>City</TableHead>
                            <TableHead>Points Balance</TableHead>
                            <TableHead>Total Visits</TableHead>
                            <TableHead>Total Spent</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentItems && currentItems.length > 0 ? currentItems.map((customer) => (
                            <TableRow key={customer.id}>
                                <TableCell>{customer.id}</TableCell>
                                <TableCell>{customer.customerName}</TableCell>
                                <TableCell>{customer.email || '-'}</TableCell>
                                <TableCell>{customer.phone || '-'}</TableCell>
                                <TableCell>{customer.address || '-'}</TableCell>
                                <TableCell>{customer.city || '-'}</TableCell>
                                <TableCell>{customer.pointsBalance ?? 0}</TableCell>
                                <TableCell>{customer.totalVisits ?? 0}</TableCell>
                                <TableCell>
                                    ${typeof customer.totalSpent === 'number'
                                        ? Number(customer.totalSpent).toFixed(2)
                                        : Number(customer.totalSpent || 0).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(customer)}
                                            className="h-8"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDelete(customer.id)}
                                            className="h-8"
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-4">
                                    No customers found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                        Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} customers
                    </span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">5 per page</SelectItem>
                            <SelectItem value="10">10 per page</SelectItem>
                            <SelectItem value="20">20 per page</SelectItem>
                            <SelectItem value="50">50 per page</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                    >
                        First
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }

                            return (
                                <Button
                                    key={i}
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    onClick={() => handlePageChange(pageNum)}
                                    className="w-10"
                                >
                                    {pageNum}
                                </Button>
                            );
                        })}
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                    >
                        Last
                    </Button>
                </div>
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{selectedCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    name="customerName"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="email"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="phone"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="address"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Address</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="city"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="province"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Province/State</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="postalCode"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Postal Code</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="country"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Country</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="customerCode"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Customer Code</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="pointsBalance"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Points Balance</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    onChange={e => field.onChange(Number(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="col-span-2">
                                <FormField
                                    name="note"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Note</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit">{selectedCustomer ? "Update" : "Create"}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
