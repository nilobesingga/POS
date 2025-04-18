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
import { User, InsertUser, StoreSettings, insertUserSchema } from "../../../shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type EmployeeFormData = z.infer<typeof insertUserSchema>;

export default function EmployeesPage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const form = useForm<EmployeeFormData>({
        resolver: zodResolver(insertUserSchema),
        defaultValues: {
            username: "",
            password: "",
            displayName: "",
            role: "cashier",
            email: "",
            phone: "",
            storeId: undefined
        }
    });

    // Fetch employees
    const { data: employees, isLoading, isError } = useQuery<User[]>({
        queryKey: ["users"],
        queryFn: async () => {
            const response = await fetch("/api/users");
            if (!response.ok) {
                throw new Error('Failed to fetch employees');
            }
            return response.json();
        }
    });

    // Effect to ensure data is fetched when component mounts
    useEffect(() => {
        // This will ensure employee data is fetched when navigating to this page
    }, []);

    const { data: stores, isLoading: isLoadingStores } = useQuery<StoreSettings[]>({
        queryKey: ["/api/store-settings"],
        queryFn: async () => {
            const response = await fetch("/api/store-settings");
            if (!response.ok) {
                throw new Error('Failed to fetch stores');
            }
            return response.json();
        }
    });

    const createEmployeeMutation = useMutation({
        mutationFn: async (data: EmployeeFormData) => {
            const response = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to create employee');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setIsFormOpen(false);
            form.reset();
            toast({
                title: "Success",
                description: "Employee created successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create employee",
                variant: "destructive",
            });
        }
    });

    const updateEmployeeMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<EmployeeFormData> }) => {
            const response = await fetch(`/api/users/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error('Failed to update employee');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setIsFormOpen(false);
            setSelectedEmployee(null);
            form.reset();
            toast({
                title: "Success",
                description: "Employee updated successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update employee",
                variant: "destructive",
            });
        }
    });

    const deleteEmployeeMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await fetch(`/api/users/${id}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                throw new Error('Failed to delete employee');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast({
                title: "Success",
                description: "Employee deleted successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete employee",
                variant: "destructive",
            });
        }
    });

    const onSubmit = (data: EmployeeFormData) => {
        if (selectedEmployee) {
            const updateData: Partial<EmployeeFormData> = {
                username: data.username,
                displayName: data.displayName,
                role: data.role,
                email: data.email,
                phone: data.phone,
                storeId: data.storeId
            };
            if (data.password) {
                updateData.password = data.password;
            }
            updateEmployeeMutation.mutate({ id: selectedEmployee.id, data: updateData });
        } else {
            createEmployeeMutation.mutate(data);
        }
    };

    const handleEdit = (employee: User) => {
        setSelectedEmployee(employee);
        form.reset({
            username: employee.username,
            displayName: employee.displayName,
            role: employee.role,
            email: employee.email || "",
            phone: employee.phone || "",
            storeId: employee.storeId || undefined,
            password: ""
        });
        setIsFormOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this employee?")) {
            deleteEmployeeMutation.mutate(id);
        }
    };

    const handleAdd = () => {
        setSelectedEmployee(null);
        form.reset({
            username: "",
            password: "",
            displayName: "",
            role: "cashier",
            email: "",
            phone: "",
            storeId: undefined
        });
        setIsFormOpen(true);
    };

    const filteredEmployees = employees?.filter((employee) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            employee.displayName.toLowerCase().includes(searchLower) ||
            employee.username.toLowerCase().includes(searchLower) ||
            employee.role.toLowerCase().includes(searchLower) ||
            (employee.email && employee.email.toLowerCase().includes(searchLower)) ||
            (employee.phone && employee.phone.toLowerCase().includes(searchLower))
        );
    }) || [];

    const totalItems = filteredEmployees.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredEmployees.slice(startIndex, endIndex);

    if (isLoading) {
        return (
            <div className="container mx-auto py-10">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Employees</h1>
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
                    <h1 className="text-2xl font-bold">Employees</h1>
                </div>
                <div className="border rounded-lg p-4 text-red-500">
                    Failed to load employees. Please try again later.
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 overflow-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Employees</h1>
                <Button onClick={handleAdd}>Add Employee</Button>
            </div>

            <div className="flex justify-between items-center mb-4">
                <div className="relative w-72">
                    <Input
                        placeholder="Search employees..."
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
                            <TableHead>Username</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Store</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentItems && currentItems.length > 0 ? currentItems.map((employee) => (
                            <TableRow key={employee.id}>
                                <TableCell>{employee.id}</TableCell>
                                <TableCell>{employee.displayName}</TableCell>
                                <TableCell>{employee.username}</TableCell>
                                <TableCell>{employee.email || '-'}</TableCell>
                                <TableCell>{employee.phone || '-'}</TableCell>
                                <TableCell className="capitalize">{employee.role}</TableCell>
                                <TableCell>
                                    {stores?.find(store => store.id === employee.storeId)?.name || '-'}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(employee)}
                                            className="h-8"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDelete(employee.id)}
                                            className="h-8"
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-4">
                                    No employees found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                        Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} employees
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
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                    >
                        First
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setCurrentPage(currentPage - 1)}
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
                                    onClick={() => setCurrentPage(pageNum)}
                                    className="w-10"
                                >
                                    {pageNum}
                                </Button>
                            );
                        })}
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                    >
                        Last
                    </Button>
                </div>
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[650px]">
                    <DialogHeader>
                        <DialogTitle>{selectedEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    name="displayName"
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
                                    name="username"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Username</FormLabel>
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
                                                <Input type="email" {...field} value={field.value || ''} />
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
                                                <Input type="tel" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="password"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{selectedEmployee ? "New Password (optional)" : "Password"}</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="role"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Role</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a role" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                    <SelectItem value="manager">Manager</SelectItem>
                                                    <SelectItem value="cashier">Cashier</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="storeId"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Store</FormLabel>
                                            <Select
                                                onValueChange={(value) => field.onChange(Number(value))}
                                                defaultValue={field.value?.toString()}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a store" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {stores && stores.map(store => (
                                                        <SelectItem key={store.id} value={store.id.toString()}>
                                                            {store.name} {store.branch ? `(${store.branch})` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    {selectedEmployee ? "Update" : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
