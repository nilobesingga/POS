import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, InsertUser, StoreSettings, InsertStoreSettings, TaxCategory, InsertTaxCategory, Role, InsertRole, POSDevice, InsertPOSDevice, PaymentType, InsertPaymentType, DiningOption, InsertDiningOption } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("stores");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Store dialog states
    const [isAddStoreDialogOpen, setIsAddStoreDialogOpen] = useState(false);
    const [isDeleteStoreDialogOpen, setIsDeleteStoreDialogOpen] = useState(false);
    const [selectedStore, setSelectedStore] = useState<StoreSettings | null>(null);
    const [newStore, setNewStore] = useState<Partial<InsertStoreSettings>>({
        name: "",
        branch: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        phone: "",
        taxRate: "8.25",
        showLogo: true,
        showCashierName: true,
        receiptFooter: "",
        isActive: true
    });

    // User management state
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [currentUserPage, setCurrentUserPage] = useState(1);
    const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
    const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newUser, setNewUser] = useState<Partial<InsertUser>>({
        username: "",
        password: "",
        displayName: "",
        role: "cashier",
        email: "",
        phone: "",
        storeId: undefined
    });

    // Tax Categories state
    const [taxSearchQuery, setTaxSearchQuery] = useState("");
    const [currentTaxPage, setCurrentTaxPage] = useState(1);
    const [isAddTaxDialogOpen, setIsAddTaxDialogOpen] = useState(false);
    const [isDeleteTaxDialogOpen, setIsDeleteTaxDialogOpen] = useState(false);
    const [selectedTax, setSelectedTax] = useState<TaxCategory | null>(null);
    const [newTax, setNewTax] = useState<Partial<InsertTaxCategory>>({
        name: "",
        rate: "0",
        isDefault: false
    });

    // Role management state
    const [roleSearchQuery, setRoleSearchQuery] = useState("");
    const [currentRolePage, setCurrentRolePage] = useState(1);
    const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
    const [isDeleteRoleDialogOpen, setIsDeleteRoleDialogOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    const defaultPermissions: RolePermissions = {
        canManageProducts: true,
        canManageCategories: true,
        canManageOrders: true,
        canManageCustomers: false,
        canViewReports: false,
        canManageSettings: false,
        canManageUsers: false
    };

    // POS Devices state
    const [deviceSearchQuery, setDeviceSearchQuery] = useState("");
    const [currentDevicePage, setCurrentDevicePage] = useState(1);
    const [isAddDeviceDialogOpen, setIsAddDeviceDialogOpen] = useState(false);
    const [isDeleteDeviceDialogOpen, setIsDeleteDeviceDialogOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<POSDevice | null>(null);
    const [newDevice, setNewDevice] = useState<Partial<InsertPOSDevice>>({
        name: "",
        storeId: undefined,
        isActive: true
    });

    // Payment Types state
    const [paymentTypeSearchQuery, setPaymentTypeSearchQuery] = useState("");
    const [currentPaymentTypePage, setCurrentPaymentTypePage] = useState(1);
    const [isAddPaymentTypeDialogOpen, setIsAddPaymentTypeDialogOpen] = useState(false);
    const [isDeletePaymentTypeDialogOpen, setIsDeletePaymentTypeDialogOpen] = useState(false);
    const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType | null>(null);
    const [newPaymentType, setNewPaymentType] = useState<Partial<InsertPaymentType>>({
        name: "",
        code: ""
    });

    // Dining Options state
    const [diningOptionSearchQuery, setDiningOptionSearchQuery] = useState("");
    const [currentDiningOptionPage, setCurrentDiningOptionPage] = useState(1);
    const [isAddDiningOptionDialogOpen, setIsAddDiningOptionDialogOpen] = useState(false);
    const [isDeleteDiningOptionDialogOpen, setIsDeleteDiningOptionDialogOpen] = useState(false);
    const [selectedDiningOption, setSelectedDiningOption] = useState<DiningOption | null>(null);
    const [newDiningOption, setNewDiningOption] = useState<Partial<InsertDiningOption>>({
        name: "",
        storeId: undefined,
        available: true,
        isDefault: false
    });

    interface POSDevice {
        id: number;
        name: string;
        storeId: number;
        isActive: boolean;
        store?: StoreSettings;
    }

    interface InsertPOSDevice {
        name: string;
        storeId: number;
        isActive: boolean;
    }

    const [newRole, setNewRole] = useState<{
        name: string;
        description: string;
        isSystem: boolean;
        permissions: RolePermissions;
    }>({
        name: "",
        description: "",
        isSystem: false,
        permissions: defaultPermissions
    });

    // Define a strongly typed permissions interface to avoid empty object type issues
    interface RolePermissions {
        canManageProducts: boolean;
        canManageCategories: boolean;
        canManageOrders: boolean;
        canManageCustomers: boolean;
        canViewReports: boolean;
        canManageSettings: boolean;
        canManageUsers: boolean;
    }

    // Fetch stores
    const {
        data: stores,
        isLoading: isLoadingStores,
    } = useQuery<StoreSettings[]>({
        queryKey: ["/api/store-settings"],
        queryFn: async () => {
            const response = await apiRequest("GET", "/api/store-settings");
            return response.json();
        }
    });

    // Fetch users
    const {
        data: users,
        isLoading: isLoadingUsers,
        isError: isUsersError
    } = useQuery({
        queryKey: ["/api/users"],
        queryFn: async () => {
            const response = await apiRequest("GET", "/api/users");
            return response.json();
        }
    });

    // Fetch tax categories
    const {
        data: taxCategories,
        isLoading: isLoadingTaxes,
        isError: isTaxesError
    } = useQuery({
        queryKey: ["/api/tax-categories"],
        queryFn: async () => {
            const response = await apiRequest("GET", "/api/tax-categories");
            return response.json();
        }
    });

    // Ensure proper typing for roles from API
    const {
        data: rolesList,
        isLoading: isLoadingRoles,
        isError: isRolesError
    } = useQuery({
        queryKey: ["/api/roles"],
        queryFn: async () => {
            const response = await apiRequest("GET", "/api/roles");
            const data = await response.json();
            return data.map((role: any) => ({
                ...role,
                permissions: role.permissions as RolePermissions
            }));
        }
    });

    // Fetch devices
    const {
        data: devices,
        isLoading: isLoadingDevices,
    } = useQuery<POSDevice[]>({
        queryKey: ["/api/pos-devices"],
        queryFn: async () => {
            const response = await apiRequest("GET", "/api/pos-devices");
            return response.json();
        }
    });

    // Fetch payment types
    const {
        data: paymentTypes,
        isLoading: isLoadingPaymentTypes,
    } = useQuery<PaymentType[]>({
        queryKey: ["/api/payment-types"],
        queryFn: async () => {
            const response = await apiRequest("GET", "/api/payment-types");
            return response.json();
        }
    });

    // Fetch dining options
    const {
        data: diningOptions,
        isLoading: isLoadingDiningOptions,
    } = useQuery<DiningOption[]>({
        queryKey: ["/api/dining-options"],
        queryFn: async () => {
            const response = await apiRequest("GET", "/api/dining-options");
            return response.json();
        }
    });

    // Add store mutation
    const addStoreMutation = useMutation({
        mutationFn: async (store: InsertStoreSettings) => {
            const response = await apiRequest("POST", "/api/store-settings", store);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/store-settings"] });
            setIsAddStoreDialogOpen(false);
            resetStoreForm();
            toast({
                title: "Store Added",
                description: "The store has been added successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to add store",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Add user mutation
    const addUserMutation = useMutation({
        mutationFn: async (user: InsertUser) => {
            const response = await apiRequest("POST", "/api/users", user);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            setIsAddUserDialogOpen(false);
            resetUserForm();
            toast({
                title: "User Added",
                description: "The user has been added successfully"
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

    // Add tax category mutation
    const addTaxMutation = useMutation({
        mutationFn: async (tax: InsertTaxCategory) => {
            const response = await apiRequest("POST", "/api/tax-categories", tax);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/tax-categories"] });
            setIsAddTaxDialogOpen(false);
            resetTaxForm();
            toast({
                title: "Tax Category Added",
                description: "The tax category has been added successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to add tax category",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Add device mutation
    const addDeviceMutation = useMutation({
        mutationFn: async (device: InsertPOSDevice) => {
            const response = await apiRequest("POST", "/api/pos-devices", device);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/pos-devices"] });
            setIsAddDeviceDialogOpen(false);
            setNewDevice({
                name: "",
                storeId: undefined,
                isActive: true
            });
            toast({
                title: "Device Added",
                description: "The device has been added successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to add device",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Add payment type mutation
    const addPaymentTypeMutation = useMutation({
        mutationFn: async (paymentType: InsertPaymentType) => {
            const response = await apiRequest("POST", "/api/payment-types", paymentType);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/payment-types"] });
            setIsAddPaymentTypeDialogOpen(false);
            setNewPaymentType({ name: "", code: "" });
            toast({
                title: "Payment Type Added",
                description: "The payment type has been added successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to add payment type",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Add dining option mutation
    const addDiningOptionMutation = useMutation({
        mutationFn: async (diningOption: InsertDiningOption) => {
            const response = await apiRequest("POST", "/api/dining-options", diningOption);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/dining-options"] });
            setIsAddDiningOptionDialogOpen(false);
            setNewDiningOption({
                name: "",
                storeId: undefined,
                available: true,
                isDefault: false
            });
            toast({
                title: "Dining Option Added",
                description: "The dining option has been added successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to add dining option",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Update store mutation
    const updateStoreMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: InsertStoreSettings }) => {
            const response = await apiRequest("PUT", `/api/store-settings/${id}`, data);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/store-settings"] });
            setIsAddStoreDialogOpen(false);
            resetStoreForm();
            toast({
                title: "Store Updated",
                description: "The store has been updated successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to update store",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Update user mutation
    const updateUserMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<InsertUser> }) => {
            const response = await apiRequest("PUT", `/api/users/${id}`, data);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            setIsAddUserDialogOpen(false);
            resetUserForm();
            toast({
                title: "User Updated",
                description: "The user has been updated successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to update user",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Update tax category mutation
    const updateTaxMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: InsertTaxCategory }) => {
            const response = await apiRequest("PUT", `/api/tax-categories/${id}`, data);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/tax-categories"] });
            setIsAddTaxDialogOpen(false);
            resetTaxForm();
            toast({
                title: "Tax Category Updated",
                description: "The tax category has been updated successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to update tax category",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Update device mutation
    const updateDeviceMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: InsertPOSDevice }) => {
            const response = await apiRequest("PUT", `/api/pos-devices/${id}`, data);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/pos-devices"] });
            setIsAddDeviceDialogOpen(false);
            setNewDevice({
                name: "",
                storeId: undefined,
                isActive: true
            });
            toast({
                title: "Device Updated",
                description: "The device has been updated successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to update device",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Update payment type mutation
    const updatePaymentTypeMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: InsertPaymentType }) => {
            const response = await apiRequest("PUT", `/api/payment-types/${id}`, data);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/payment-types"] });
            setIsAddPaymentTypeDialogOpen(false);
            setNewPaymentType({ name: "", code: "" });
            toast({
                title: "Payment Type Updated",
                description: "The payment type has been updated successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to update payment type",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Update dining option mutation
    const updateDiningOptionMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: InsertDiningOption }) => {
            const response = await apiRequest("PUT", `/api/dining-options/${id}`, data);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/dining-options"] });
            setIsAddDiningOptionDialogOpen(false);
            setNewDiningOption({
                name: "",
                storeId: undefined,
                available: true,
                isDefault: false
            });
            toast({
                title: "Dining Option Updated",
                description: "The dining option has been updated successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to update dining option",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Delete store mutation
    const deleteStoreMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest("DELETE", `/api/store-settings/${id}`);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/store-settings"] });
            setIsDeleteStoreDialogOpen(false);
            setSelectedStore(null);
            toast({
                title: "Store Deleted",
                description: "The store has been deleted successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to delete store",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Delete user mutation
    const deleteUserMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest("DELETE", `/api/users/${id}`);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            setIsDeleteUserDialogOpen(false);
            setSelectedUser(null);
            toast({
                title: "User Deleted",
                description: "The user has been deleted successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to delete user",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Delete tax category mutation
    const deleteTaxMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest("DELETE", `/api/tax-categories/${id}`);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/tax-categories"] });
            setIsDeleteTaxDialogOpen(false);
            setSelectedTax(null);
            toast({
                title: "Tax Category Deleted",
                description: "The tax category has been deleted successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to delete tax category",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Delete device mutation
    const deleteDeviceMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest("DELETE", `/api/pos-devices/${id}`);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/pos-devices"] });
            setIsDeleteDeviceDialogOpen(false);
            setSelectedDevice(null);
            toast({
                title: "Device Deleted",
                description: "The device has been deleted successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to delete device",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Delete payment type mutation
    const deletePaymentTypeMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest("DELETE", `/api/payment-types/${id}`);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/payment-types"] });
            setIsDeletePaymentTypeDialogOpen(false);
            setSelectedPaymentType(null);
            toast({
                title: "Payment Type Deleted",
                description: "The payment type has been deleted successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to delete payment type",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Delete dining option mutation
    const deleteDiningOptionMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest("DELETE", `/api/dining-options/${id}`);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/dining-options"] });
            setIsDeleteDiningOptionDialogOpen(false);
            setSelectedDiningOption(null);
            toast({
                title: "Dining Option Deleted",
                description: "The dining option has been deleted successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to delete dining option",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Add role mutation with proper typing
    const addRoleMutation = useMutation({
        mutationFn: async (role: InsertRole) => {
            const response = await apiRequest("POST", "/api/roles", {
                ...role,
                isSystem: false
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
            setIsAddRoleDialogOpen(false);
            resetRoleForm();
            toast({
                title: "Role Added",
                description: "The role has been added successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to add role",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Update role mutation with proper typing
    const updateRoleMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: InsertRole & { isSystem: boolean } }) => {
            const response = await apiRequest("PUT", `/api/roles/${id}`, data);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
            setIsAddRoleDialogOpen(false);
            resetRoleForm();
            toast({
                title: "Role Updated",
                description: "The role has been updated successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to update role",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Delete role mutation
    const deleteRoleMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest("DELETE", `/api/roles/${id}`);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
            setIsDeleteRoleDialogOpen(false);
            setSelectedRole(null);
            toast({
                title: "Role Deleted",
                description: "The role has been deleted successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to delete role",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Upload logo mutation
    const uploadLogoMutation = useMutation({
        mutationFn: async ({ id, file }: { id: number; file: File }) => {
            const formData = new FormData();
            formData.append('logo', file);
            const response = await fetch(`/api/store-settings/${id}/logo`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to upload logo');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/store-settings"] });
            toast({
                title: "Logo Updated",
                description: "Store logo has been updated successfully"
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to upload logo",
                description: error instanceof Error ? error.message : "An unknown error occurred",
                variant: "destructive"
            });
        }
    });

    // Store form handlers
    const handleStoreChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewStore(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewUser(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewTax(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSwitchChange = (name: string, checked: boolean) => {
        setNewStore(prev => ({
            ...prev,
            [name]: checked
        }));
    };

    const handleTaxDefaultChange = (checked: boolean) => {
        setNewTax(prev => ({
            ...prev,
            isDefault: checked
        }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedStore) return;

        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.match(/image\/(jpeg|png|gif)/)) {
            toast({
                title: "Invalid file type",
                description: "Please upload an image file (JPG, PNG, or GIF)",
                variant: "destructive"
            });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "File too large",
                description: "Logo file must be less than 5MB",
                variant: "destructive"
            });
            return;
        }

        uploadLogoMutation.mutate({ id: selectedStore.id, file });
    };

    // Form submission handlers
    const handleAddStore = (e: React.FormEvent) => {
        e.preventDefault();

        if (!newStore.name?.trim()) {
            toast({
                title: "Validation Error",
                description: "Store name is required",
                variant: "destructive"
            });
            return;
        }

        const rate = Number(newStore.taxRate);
        if (isNaN(rate) || rate < 0 || rate > 100) {
            toast({
                title: "Validation Error",
                description: "Tax rate must be between 0 and 100",
                variant: "destructive"
            });
            return;
        }

        if (selectedStore) {
            updateStoreMutation.mutate({
                id: selectedStore.id,
                data: newStore as InsertStoreSettings
            });
        } else {
            addStoreMutation.mutate(newStore as InsertStoreSettings);
        }
    };

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();

        if (!newUser.username?.trim() || !newUser.displayName?.trim()) {
            toast({
                title: "Validation Error",
                description: "Username and display name are required",
                variant: "destructive"
            });
            return;
        }

        if (!selectedUser && !newUser.password?.trim()) {
            toast({
                title: "Validation Error",
                description: "Password is required for new users",
                variant: "destructive"
            });
            return;
        }

        if (selectedUser) {
            updateUserMutation.mutate({
                id: selectedUser.id,
                data: newUser
            });
        } else {
            addUserMutation.mutate(newUser as InsertUser);
        }
    };

    const handleAddTax = (e: React.FormEvent) => {
        e.preventDefault();

        if (!newTax.name?.trim()) {
            toast({
                title: "Validation Error",
                description: "Tax category name is required",
                variant: "destructive"
            });
            return;
        }

        const rate = Number(newTax.rate);
        if (isNaN(rate) || rate < 0 || rate > 100) {
            toast({
                title: "Validation Error",
                description: "Tax rate must be between 0 and 100",
                variant: "destructive"
            });
            return;
        }

        if (selectedTax) {
            updateTaxMutation.mutate({
                id: selectedTax.id,
                data: newTax as InsertTaxCategory
            });
        } else {
            addTaxMutation.mutate(newTax as InsertTaxCategory);
        }
    };

    const handleAddDevice = (e: React.FormEvent) => {
        e.preventDefault();

        if (!newDevice.name?.trim() || !newDevice.storeId) {
            toast({
                title: "Validation Error",
                description: "Device name and store are required",
                variant: "destructive"
            });
            return;
        }

        if (selectedDevice) {
            updateDeviceMutation.mutate({
                id: selectedDevice.id,
                data: newDevice as InsertPOSDevice
            });
        } else {
            addDeviceMutation.mutate(newDevice as InsertPOSDevice);
        }
    };

    const handleAddPaymentType = (e: React.FormEvent) => {
        e.preventDefault();

        if (!newPaymentType.name?.trim() || !newPaymentType.code?.trim()) {
            toast({
                title: "Validation Error",
                description: "Name and code are required",
                variant: "destructive"
            });
            return;
        }

        if (selectedPaymentType) {
            updatePaymentTypeMutation.mutate({
                id: selectedPaymentType.id,
                data: newPaymentType as InsertPaymentType
            });
        } else {
            addPaymentTypeMutation.mutate(newPaymentType as InsertPaymentType);
        }
    };

    const handleAddDiningOption = (e: React.FormEvent) => {
        e.preventDefault();

        if (!newDiningOption.name?.trim() || !newDiningOption.storeId) {
            toast({
                title: "Validation Error",
                description: "Name and store are required",
                variant: "destructive"
            });
            return;
        }

        if (selectedDiningOption) {
            updateDiningOptionMutation.mutate({
                id: selectedDiningOption.id,
                data: newDiningOption as InsertDiningOption
            });
        } else {
            addDiningOptionMutation.mutate(newDiningOption as InsertDiningOption);
        }
    };

    const handleAddRole = (e: React.FormEvent) => {
        e.preventDefault();

        if (!newRole.name?.trim()) {
            toast({
                title: "Validation Error",
                description: "Role name is required",
                variant: "destructive"
            });
            return;
        }

        if (selectedRole) {
            updateRoleMutation.mutate({
                id: selectedRole.id,
                data: {
                    name: newRole.name,
                    description: newRole.description,
                    isSystem: false,
                    permissions: newRole.permissions
                }
            });
        } else {
            addRoleMutation.mutate({
                name: newRole.name,
                description: newRole.description,
                isSystem: false,
                permissions: newRole.permissions
            });
        }
    };

    const handleEditStore = (store: StoreSettings) => {
        setSelectedStore(store);
        setNewStore({
            name: store.name,
            branch: store.branch || "",
            address: store.address || "",
            city: store.city || "",
            state: store.state || "",
            zipCode: store.zipCode || "",
            phone: store.phone || "",
            taxRate: store.taxRate.toString(),
            showLogo: store.showLogo,
            showCashierName: store.showCashierName,
            receiptFooter: store.receiptFooter || "",
            isActive: store.isActive
        });
        setIsAddStoreDialogOpen(true);
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setNewUser({
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            email: user.email || "",
            phone: user.phone || "",
            storeId: user.storeId
        });
        setIsAddUserDialogOpen(true);
    };

    const handleEditTax = (tax: TaxCategory) => {
        setSelectedTax(tax);
        setNewTax({
            name: tax.name,
            rate: tax.rate.toString(),
            isDefault: tax.isDefault
        });
        setIsAddTaxDialogOpen(true);
    };

    const handleEditDevice = (device: POSDevice) => {
        setSelectedDevice(device);
        setNewDevice({
            name: device.name,
            storeId: device.storeId,
            isActive: device.isActive
        });
        setIsAddDeviceDialogOpen(true);
    };

    const handleEditPaymentType = (type: PaymentType) => {
        setSelectedPaymentType(type);
        setNewPaymentType({
            name: type.name,
            code: type.code
        });
        setIsAddPaymentTypeDialogOpen(true);
    };

    const handleEditDiningOption = (option: DiningOption) => {
        setSelectedDiningOption(option);
        setNewDiningOption({
            name: option.name,
            storeId: option.storeId,
            available: option.available,
            isDefault: option.isDefault
        });
        setIsAddDiningOptionDialogOpen(true);
    };

    const handleDeleteStore = (store: StoreSettings) => {
        setSelectedStore(store);
        setIsDeleteStoreDialogOpen(true);
    };

    const handleDeleteUser = (user: User) => {
        setSelectedUser(user);
        setIsDeleteUserDialogOpen(true);
    };

    const handleDeleteTax = (tax: TaxCategory) => {
        setSelectedTax(tax);
        setIsDeleteTaxDialogOpen(true);
    };

    const handleDeleteDevice = (device: POSDevice) => {
        setSelectedDevice(device);
        setIsDeleteDeviceDialogOpen(true);
    };

    const handleDeletePaymentType = (type: PaymentType) => {
        setSelectedPaymentType(type);
        setIsDeletePaymentTypeDialogOpen(true);
    };

    const handleDeleteDiningOption = (option: DiningOption) => {
        setSelectedDiningOption(option);
        setIsDeleteDiningOptionDialogOpen(true);
    };

    const confirmDeleteStore = () => {
        if (selectedStore) {
            deleteStoreMutation.mutate(selectedStore.id);
        }
    };

    const confirmDeleteUser = () => {
        if (selectedUser) {
            deleteUserMutation.mutate(selectedUser.id);
        }
    };

    const confirmDeleteTax = () => {
        if (selectedTax) {
            deleteTaxMutation.mutate(selectedTax.id);
        }
    };

    const confirmDeleteDevice = () => {
        if (selectedDevice) {
            deleteDeviceMutation.mutate(selectedDevice.id);
        }
    };

    const handleConfirmDeletePaymentType = () => {
        if (selectedPaymentType) {
            deletePaymentTypeMutation.mutate(selectedPaymentType.id);
        }
    };

    const handleConfirmDeleteDiningOption = () => {
        if (selectedDiningOption) {
            deleteDiningOptionMutation.mutate(selectedDiningOption.id);
        }
    };

    const resetStoreForm = () => {
        setNewStore({
            name: "",
            branch: "",
            address: "",
            city: "",
            state: "",
            zipCode: "",
            phone: "",
            taxRate: "8.25",
            showLogo: true,
            showCashierName: true,
            receiptFooter: "",
            isActive: true
        });
        setSelectedStore(null);
    };

    const resetUserForm = () => {
        setNewUser({
            username: "",
            password: "",
            displayName: "",
            role: "cashier",
            email: "",
            phone: "",
            storeId: undefined
        });
        setSelectedUser(null);
    };

    const resetTaxForm = () => {
        setNewTax({
            name: "",
            rate: "0",
            isDefault: false
        });
        setSelectedTax(null);
    };

    const resetRoleForm = () => {
        setNewRole({
            name: "",
            description: "",
            isSystem: false,
            permissions: defaultPermissions
        });
        setSelectedRole(null);
    };

    // Filter and paginate stores
    const filteredStores = stores?.filter((store: StoreSettings) =>
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.branch?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.state?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const filteredUsers = users?.filter((user: User) =>
        user.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(userSearchQuery.toLowerCase())
    ) || [];

    const filteredTaxes = taxCategories?.filter((tax: TaxCategory) =>
        tax.name.toLowerCase().includes(taxSearchQuery.toLowerCase())
    ) || [];

    const filteredDevices = devices?.filter((device: POSDevice) =>
        device.name.toLowerCase().includes(deviceSearchQuery.toLowerCase())
    ) || [];

    const totalPages = Math.ceil(filteredStores.length / itemsPerPage);
    const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const totalTaxPages = Math.ceil(filteredTaxes.length / itemsPerPage);
    const totalDevicePages = Math.ceil(filteredDevices.length / itemsPerPage);
    const paginatedStores = filteredStores.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const paginatedUsers = filteredUsers.slice(
        (currentUserPage - 1) * itemsPerPage,
        currentUserPage * itemsPerPage
    );
    const paginatedTaxes = filteredTaxes.slice(
        (currentTaxPage - 1) * itemsPerPage,
        currentTaxPage * itemsPerPage
    );
    const paginatedDevices = filteredDevices.slice(
        (currentDevicePage - 1) * itemsPerPage,
        currentDevicePage * itemsPerPage
    );

    return (
        <div className="flex-1 p-6 overflow-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Settings</h1>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                    <TabsTrigger value="stores">Stores</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="taxes">Taxes</TabsTrigger>
                    <TabsTrigger value="roles">Roles</TabsTrigger>
                    <TabsTrigger value="devices">Devices</TabsTrigger>
                    <TabsTrigger value="payment-types">Payment Types</TabsTrigger>
                    <TabsTrigger value="dining-options">Dining Options</TabsTrigger>
                </TabsList>

                <TabsContent value="stores">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex-1 max-w-sm">
                            <Input
                                placeholder="Search stores..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="max-w-xs"
                            />
                        </div>
                        <Button onClick={() => {
                            resetStoreForm();
                            setIsAddStoreDialogOpen(true);
                        }}>
                            Add Store
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead>City</TableHead>
                                    <TableHead>State</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingStores ? (
                                    Array(5).fill(0).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[200px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[60px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    paginatedStores.map((store: StoreSettings) => (
                                        <TableRow key={store.id}>
                                            <TableCell>{store.name}</TableCell>
                                            <TableCell>{store.branch || '-'}</TableCell>
                                            <TableCell>{store.address || '-'}</TableCell>
                                            <TableCell>{store.city || '-'}</TableCell>
                                            <TableCell>{store.state || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={store.isActive ? "default" : "secondary"}>
                                                    {store.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEditStore(store)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDeleteStore(store)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(currentPage - 1)}
                            >
                                Previous
                            </Button>
                            <span className="text-sm">
                                Page {currentPage} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(currentPage + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    )}

                    {/* Add/Edit Store Dialog */}
                    <Dialog open={isAddStoreDialogOpen} onOpenChange={setIsAddStoreDialogOpen}>
                        <DialogContent className="max-w-[900px] w-[90vw]">
                            <DialogHeader>
                                <DialogTitle>
                                    {selectedStore ? "Edit Store" : "Add Store"}
                                </DialogTitle>
                            </DialogHeader>

                            <form onSubmit={handleAddStore}>
                                <div className="grid grid-cols-2 gap-6 py-4">
                                    {/* Left Column */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Store Logo</Label>
                                            {selectedStore?.logo && (
                                                <div className="mb-4">
                                                    <img
                                                        src={selectedStore.logo}
                                                        alt="Store Logo"
                                                        className="max-w-[200px] h-auto rounded-lg shadow-sm"
                                                    />
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoUpload}
                                                    disabled={uploadLogoMutation.isPending}
                                                />
                                                <p className="text-sm text-gray-500">
                                                    Upload a logo (max 5MB, JPG/PNG/GIF)
                                                    {uploadLogoMutation.isPending && " - Uploading..."}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="name">Store Name*</Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                value={newStore.name}
                                                onChange={handleStoreChange}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="branch">Branch</Label>
                                            <Input
                                                id="branch"
                                                name="branch"
                                                value={newStore.branch || ""}
                                                onChange={handleStoreChange}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="address">Address</Label>
                                            <Input
                                                id="address"
                                                name="address"
                                                value={newStore.address || ""}
                                                onChange={handleStoreChange}
                                            />
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="city">City</Label>
                                                <Input
                                                    id="city"
                                                    name="city"
                                                    value={newStore.city || ""}
                                                    onChange={handleStoreChange}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="state">State</Label>
                                                <Input
                                                    id="state"
                                                    name="state"
                                                    value={newStore.state || ""}
                                                    onChange={handleStoreChange}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="zipCode">ZIP Code</Label>
                                                <Input
                                                    id="zipCode"
                                                    name="zipCode"
                                                    value={newStore.zipCode || ""}
                                                    onChange={handleStoreChange}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number</Label>
                                            <Input
                                                id="phone"
                                                name="phone"
                                                value={newStore.phone || ""}
                                                onChange={handleStoreChange}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="taxRate">Tax Rate (%)</Label>
                                            <Input
                                                id="taxRate"
                                                name="taxRate"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                value={newStore.taxRate}
                                                onChange={handleStoreChange}
                                            />
                                        </div>

                                        <div className="space-y-4 p-4 border rounded-lg">
                                            <h3 className="font-medium mb-2">Receipt Settings</h3>
                                            <div className="space-y-4">
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        checked={newStore.showLogo}
                                                        onCheckedChange={(checked) => handleSwitchChange("showLogo", checked)}
                                                    />
                                                    <Label>Show Logo on Receipt</Label>
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        checked={newStore.showCashierName}
                                                        onCheckedChange={(checked) => handleSwitchChange("showCashierName", checked)}
                                                    />
                                                    <Label>Show Cashier Name on Receipt</Label>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="receiptFooter">Receipt Footer</Label>
                                                    <Textarea
                                                        id="receiptFooter"
                                                        name="receiptFooter"
                                                        value={newStore.receiptFooter || ""}
                                                        onChange={handleStoreChange}
                                                        rows={3}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="mt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsAddStoreDialogOpen(false);
                                            resetStoreForm();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={addStoreMutation.isPending || updateStoreMutation.isPending}
                                    >
                                        {addStoreMutation.isPending || updateStoreMutation.isPending
                                            ? "Saving..."
                                            : selectedStore
                                            ? "Save Changes"
                                            : "Add Store"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Store Dialog */}
                    <AlertDialog open={isDeleteStoreDialogOpen} onOpenChange={setIsDeleteStoreDialogOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Store</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete this store? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setIsDeleteStoreDialogOpen(false)}>
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={confirmDeleteStore}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TabsContent>

                <TabsContent value="users">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex-1 max-w-sm">
                            <Input
                                placeholder="Search users..."
                                value={userSearchQuery}
                                onChange={(e) => setUserSearchQuery(e.target.value)}
                                className="max-w-xs"
                            />
                        </div>
                        <Button onClick={() => {
                            resetUserForm();
                            setIsAddUserDialogOpen(true);
                        }}>
                            Add User
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Display Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingUsers ? (
                                    Array(5).fill(0).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[200px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    paginatedUsers.map((user: User) => (
                                        <TableRow key={user.id}>
                                            <TableCell>{user.username}</TableCell>
                                            <TableCell>{user.displayName}</TableCell>
                                            <TableCell>{user.email || '-'}</TableCell>
                                            <TableCell>{user.role}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEditUser(user)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDeleteUser(user)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalUserPages > 1 && (
                        <div className="flex justify-center gap-2 mt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentUserPage === 1}
                                onClick={() => setCurrentUserPage(currentUserPage - 1)}
                            >
                                Previous
                            </Button>
                            <span className="text-sm">
                                Page {currentUserPage} of {totalUserPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentUserPage === totalUserPages}
                                onClick={() => setCurrentUserPage(currentUserPage + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    )}

                    {/* Add/Edit User Dialog */}
                    <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                        <DialogContent className="max-w-[600px] w-[90vw]">
                            <DialogHeader>
                                <DialogTitle>
                                    {selectedUser ? "Edit User" : "Add User"}
                                </DialogTitle>
                            </DialogHeader>

                            <form onSubmit={handleAddUser}>
                                <div className="space-y-4 py-4">
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

                                    {!selectedUser && (
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password*</Label>
                                            <Input
                                                id="password"
                                                name="password"
                                                type="password"
                                                value={newUser.password || ""}
                                                onChange={handleUserChange}
                                                required
                                            />
                                        </div>
                                    )}

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

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={newUser.email || ""}
                                            onChange={handleUserChange}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            name="phone"
                                            value={newUser.phone || ""}
                                            onChange={handleUserChange}
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
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="manager">Manager</SelectItem>
                                                <SelectItem value="cashier">Cashier</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <DialogFooter className="mt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsAddUserDialogOpen(false);
                                            resetUserForm();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={addUserMutation.isPending || updateUserMutation.isPending}
                                    >
                                        {addUserMutation.isPending || updateUserMutation.isPending
                                            ? "Saving..."
                                            : selectedUser
                                            ? "Save Changes"
                                            : "Add User"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Delete User Dialog */}
                    <AlertDialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete this user? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setIsDeleteUserDialogOpen(false)}>
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={confirmDeleteUser}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TabsContent>

                <TabsContent value="taxes">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex-1 max-w-sm">
                            <Input
                                placeholder="Search tax categories..."
                                value={taxSearchQuery}
                                onChange={(e) => setTaxSearchQuery(e.target.value)}
                                className="max-w-xs"
                            />
                        </div>
                        <Button onClick={() => {
                            resetTaxForm();
                            setIsAddTaxDialogOpen(true);
                        }}>
                            Add Tax Category
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Rate (%)</TableHead>
                                    <TableHead>Default</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingTaxes ? (
                                    Array(5).fill(0).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[60px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    paginatedTaxes.map((tax: TaxCategory) => (
                                        <TableRow key={tax.id}>
                                            <TableCell>{tax.name}</TableCell>
                                            <TableCell>{tax.rate}</TableCell>
                                            <TableCell>
                                                <Badge variant={tax.isDefault ? "default" : "secondary"}>
                                                    {tax.isDefault ? "Yes" : "No"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEditTax(tax)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDeleteTax(tax)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalTaxPages > 1 && (
                        <div className="flex justify-center gap-2 mt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentTaxPage === 1}
                                onClick={() => setCurrentTaxPage(currentTaxPage - 1)}
                            >
                                Previous
                            </Button>
                            <span className="text-sm">
                                Page {currentTaxPage} of {totalTaxPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentTaxPage === totalTaxPages}
                                onClick={() => setCurrentTaxPage(currentTaxPage + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    )}

                    {/* Add/Edit Tax Dialog */}
                    <Dialog open={isAddTaxDialogOpen} onOpenChange={setIsAddTaxDialogOpen}>
                        <DialogContent className="max-w-[600px] w-[90vw]">
                            <DialogHeader>
                                <DialogTitle>
                                    {selectedTax ? "Edit Tax Category" : "Add Tax Category"}
                                </DialogTitle>
                            </DialogHeader>

                            <form onSubmit={handleAddTax}>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name*</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            value={newTax.name}
                                            onChange={handleTaxChange}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="rate">Rate (%)</Label>
                                        <Input
                                            id="rate"
                                            name="rate"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={newTax.rate}
                                            onChange={handleTaxChange}
                                            required
                                        />
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            checked={newTax.isDefault}
                                            onCheckedChange={handleTaxDefaultChange}
                                        />
                                        <Label>Set as Default</Label>
                                    </div>
                                </div>

                                <DialogFooter className="mt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsAddTaxDialogOpen(false);
                                            resetTaxForm();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={addTaxMutation.isPending || updateTaxMutation.isPending}
                                    >
                                        {addTaxMutation.isPending || updateTaxMutation.isPending
                                            ? "Saving..."
                                            : selectedTax
                                            ? "Save Changes"
                                            : "Add Tax Category"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Tax Dialog */}
                    <AlertDialog open={isDeleteTaxDialogOpen} onOpenChange={setIsDeleteTaxDialogOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Tax Category</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete this tax category? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setIsDeleteTaxDialogOpen(false)}>
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={confirmDeleteTax}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TabsContent>

                <TabsContent value="roles">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex-1 max-w-sm">
                            <Input
                                placeholder="Search roles..."
                                value={roleSearchQuery}
                                onChange={(e) => setRoleSearchQuery(e.target.value)}
                                className="max-w-xs"
                            />
                        </div>
                        <Button onClick={() => {
                            resetRoleForm();
                            setSelectedRole(null);
                            setIsAddRoleDialogOpen(true);
                        }}>
                            Add Role
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Permissions</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingRoles ? (
                                    Array(3).fill(0).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[200px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[250px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : isRolesError ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-4 text-red-500">
                                            Failed to load roles. Please try again.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {/* System Roles */}
                                        <TableRow>
                                            <TableCell className="font-medium">Admin</TableCell>
                                            <TableCell>Full system access with all permissions</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    <Badge variant="outline" className="bg-green-50">All</Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled
                                                    >
                                                        System Role
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Manager</TableCell>
                                            <TableCell>Store management access</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    <Badge variant="outline" className="bg-green-50">Products</Badge>
                                                    <Badge variant="outline" className="bg-green-50">Categories</Badge>
                                                    <Badge variant="outline" className="bg-green-50">Orders</Badge>
                                                    <Badge variant="outline" className="bg-green-50">Customers</Badge>
                                                    <Badge variant="outline" className="bg-green-50">Reports</Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled
                                                    >
                                                        System Role
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Cashier</TableCell>
                                            <TableCell>POS access for checkout operations</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    <Badge variant="outline" className="bg-green-50">Orders</Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled
                                                    >
                                                        System Role
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>

                                        {/* Custom roles from database */}
                                        {rolesList && rolesList
                                            .filter((role: Role) =>
                                                (role?.name?.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
                                                (role?.description && role.description.toLowerCase().includes(roleSearchQuery.toLowerCase()))) &&
                                                !role?.isSystem
                                            )
                                            .map((role: Role) => (
                                                <TableRow key={role?.id || 'unknown'}>
                                                    <TableCell className="font-medium">{role?.name || 'Unnamed Role'}</TableCell>
                                                    <TableCell>{role?.description || '-'}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {role?.permissions?.canManageProducts && (
                                                                <Badge variant="outline" className="bg-green-50">Products</Badge>
                                                            )}
                                                            {role?.permissions?.canManageCategories && (
                                                                <Badge variant="outline" className="bg-green-50">Categories</Badge>
                                                            )}
                                                            {role?.permissions?.canManageOrders && (
                                                                <Badge variant="outline" className="bg-green-50">Orders</Badge>
                                                            )}
                                                            {role?.permissions?.canManageCustomers && (
                                                                <Badge variant="outline" className="bg-green-50">Customers</Badge>
                                                            )}
                                                            {role?.permissions?.canViewReports && (
                                                                <Badge variant="outline" className="bg-green-50">Reports</Badge>
                                                            )}
                                                            {role?.permissions?.canManageSettings && (
                                                                <Badge variant="outline" className="bg-green-50">Settings</Badge>
                                                            )}
                                                            {role?.permissions?.canManageUsers && (
                                                                <Badge variant="outline" className="bg-green-50">Users</Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedRole(role);
                                                                    setNewRole({
                                                                        name: role?.name || '',
                                                                        description: role?.description || '',
                                                                        isSystem: false,
                                                                        permissions: {
                                                                            canManageProducts: !!role?.permissions?.canManageProducts,
                                                                            canManageCategories: !!role?.permissions?.canManageCategories,
                                                                            canManageOrders: !!role?.permissions?.canManageOrders,
                                                                            canManageCustomers: !!role?.permissions?.canManageCustomers,
                                                                            canViewReports: !!role?.permissions?.canViewReports,
                                                                            canManageSettings: !!role?.permissions?.canManageSettings,
                                                                            canManageUsers: !!role?.permissions?.canManageUsers
                                                                        }
                                                                    });
                                                                    setIsAddRoleDialogOpen(true);
                                                                }}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedRole(role);
                                                                    setIsDeleteRoleDialogOpen(true);
                                                                }}
                                                            >
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        }

                                        {rolesList && rolesList.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                                                    No custom roles found. Add a new role to get started.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Add/Edit Role Dialog */}
                    <Dialog open={isAddRoleDialogOpen} onOpenChange={setIsAddRoleDialogOpen}>
                        <DialogContent className="max-w-[700px] w-[90vw]">
                            <DialogHeader>
                                <DialogTitle>
                                    {selectedRole ? "Edit Role" : "Add Role"}
                                </DialogTitle>
                            </DialogHeader>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                if (!newRole.name?.trim()) {
                                    toast({
                                        title: "Validation Error",
                                        description: "Role name is required",
                                        variant: "destructive"
                                    });
                                    return;
                                }

                                if (selectedRole) {
                                    updateRoleMutation.mutate({
                                        id: selectedRole.id,
                                        data: {
                                            name: newRole.name || "",
                                            description: newRole.description || "",
                                            isSystem: false,
                                            permissions: newRole.permissions
                                        }
                                    });
                                } else {
                                    addRoleMutation.mutate({
                                        name: newRole.name || "",
                                        description: newRole.description || "",
                                        isSystem: false,
                                        permissions: newRole.permissions
                                    });
                                }
                            }}>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Role Name*</Label>
                                        <Input
                                            id="name"
                                            value={newRole.name}
                                            onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={newRole.description}
                                            onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                                            rows={2}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <Label>Permissions</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    id="manageProducts"
                                                    checked={newRole.permissions.canManageProducts}
                                                    onCheckedChange={(checked) =>
                                                        setNewRole({
                                                            ...newRole,
                                                            permissions: {
                                                                ...newRole.permissions,
                                                                canManageProducts: checked
                                                            }
                                                        })
                                                    }
                                                />
                                                <Label htmlFor="manageProducts">Manage Products</Label>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    id="manageCategories"
                                                    checked={newRole.permissions.canManageCategories}
                                                    onCheckedChange={(checked) =>
                                                        setNewRole({
                                                            ...newRole,
                                                            permissions: {
                                                                ...newRole.permissions,
                                                                canManageCategories: checked
                                                            }
                                                        })
                                                    }
                                                />
                                                <Label htmlFor="manageCategories">Manage Categories</Label>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    id="manageOrders"
                                                    checked={newRole.permissions.canManageOrders}
                                                    onCheckedChange={(checked) =>
                                                        setNewRole({
                                                            ...newRole,
                                                            permissions: {
                                                                ...newRole.permissions,
                                                                canManageOrders: checked
                                                            }
                                                        })
                                                    }
                                                />
                                                <Label htmlFor="manageOrders">Manage Orders</Label>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    id="manageCustomers"
                                                    checked={newRole.permissions.canManageCustomers}
                                                    onCheckedChange={(checked) =>
                                                        setNewRole({
                                                            ...newRole,
                                                            permissions: {
                                                                ...newRole.permissions,
                                                                canManageCustomers: checked
                                                            }
                                                        })
                                                    }
                                                />
                                                <Label htmlFor="manageCustomers">Manage Customers</Label>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    id="viewReports"
                                                    checked={newRole.permissions.canViewReports}
                                                    onCheckedChange={(checked) =>
                                                        setNewRole({
                                                            ...newRole,
                                                            permissions: {
                                                                ...newRole.permissions,
                                                                canViewReports: checked
                                                            }
                                                        })
                                                    }
                                                />
                                                <Label htmlFor="viewReports">View Reports</Label>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    id="manageSettings"
                                                    checked={newRole.permissions.canManageSettings}
                                                    onCheckedChange={(checked) =>
                                                        setNewRole({
                                                            ...newRole,
                                                            permissions: {
                                                                ...newRole.permissions,
                                                                canManageSettings: checked
                                                            }
                                                        })
                                                    }
                                                />
                                                <Label htmlFor="manageSettings">Manage Settings</Label>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    id="manageUsers"
                                                    checked={newRole.permissions.canManageUsers}
                                                    onCheckedChange={(checked) =>
                                                        setNewRole({
                                                            ...newRole,
                                                            permissions: {
                                                                ...newRole.permissions,
                                                                canManageUsers: checked
                                                            }
                                                        })
                                                    }
                                                />
                                                <Label htmlFor="manageUsers">Manage Users</Label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="mt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsAddRoleDialogOpen(false);
                                            resetRoleForm();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={addRoleMutation.isPending || updateRoleMutation.isPending}
                                    >
                                        {addRoleMutation.isPending || updateRoleMutation.isPending
                                            ? "Saving..."
                                            : selectedRole
                                            ? "Save Changes"
                                            : "Add Role"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Role Dialog */}
                    <AlertDialog open={isDeleteRoleDialogOpen} onOpenChange={setIsDeleteRoleDialogOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Role</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete this role? This action cannot be undone.
                                    Any users assigned to this role will need to be reassigned.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setIsDeleteRoleDialogOpen(false)}>
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => {
                                        if (selectedRole) {
                                            deleteRoleMutation.mutate(selectedRole.id);
                                        }
                                    }}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TabsContent>

                <TabsContent value="devices">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex-1 max-w-sm">
                            <Input
                                placeholder="Search devices..."
                                value={deviceSearchQuery}
                                onChange={(e) => setDeviceSearchQuery(e.target.value)}
                                className="max-w-xs"
                            />
                        </div>
                        <Button onClick={() => {
                            setNewDevice({
                                name: "",
                                storeId: undefined,
                                isActive: true
                            });
                            setSelectedDevice(null);
                            setIsAddDeviceDialogOpen(true);
                        }}>
                            Add Device
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Store</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingDevices ? (
                                    Array(5).fill(0).map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[60px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    paginatedDevices.map((device) => (
                                        <TableRow key={device.id}>
                                            <TableCell>{device.name}</TableCell>
                                            <TableCell>
                                                {stores?.find(store => store.id === device.storeId)?.name || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={device.isActive ? "default" : "secondary"}>
                                                    {device.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEditDevice(device)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDeleteDevice(device)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalDevicePages > 1 && (
                        <div className="flex justify-center gap-2 mt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentDevicePage === 1}
                                onClick={() => setCurrentDevicePage(currentDevicePage - 1)}
                            >
                                Previous
                            </Button>
                            <span className="text-sm">
                                Page {currentDevicePage} of {totalDevicePages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentDevicePage === totalDevicePages}
                                onClick={() => setCurrentDevicePage(currentDevicePage + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    )}

                    {/* Add/Edit Device Dialog */}
                    <Dialog open={isAddDeviceDialogOpen} onOpenChange={setIsAddDeviceDialogOpen}>
                        <DialogContent className="max-w-[600px] w-[90vw]">
                            <DialogHeader>
                                <DialogTitle>
                                    {selectedDevice ? "Edit Device" : "Add Device"}
                                </DialogTitle>
                            </DialogHeader>

                            <form onSubmit={handleAddDevice}>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Device Name*</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            value={newDevice.name}
                                            onChange={(e) => setNewDevice({
                                                ...newDevice,
                                                name: e.target.value
                                            })}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="store">Store*</Label>
                                        <Select
                                            value={newDevice.storeId?.toString()}
                                            onValueChange={(value) => setNewDevice({
                                                ...newDevice,
                                                storeId: parseInt(value)
                                            })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select store" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {stores?.map((store) => (
                                                    <SelectItem
                                                        key={store.id}
                                                        value={store.id.toString()}
                                                    >
                                                        {store.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="isActive"
                                            checked={newDevice.isActive}
                                            onCheckedChange={(checked) => setNewDevice({
                                                ...newDevice,
                                                isActive: checked
                                            })}
                                        />
                                        <Label htmlFor="isActive">Active</Label>
                                    </div>
                                </div>

                                <DialogFooter className="mt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsAddDeviceDialogOpen(false);
                                            setNewDevice({
                                                name: "",
                                                storeId: undefined,
                                                isActive: true
                                            });
                                            setSelectedDevice(null);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={!newDevice.name || !newDevice.storeId || addDeviceMutation.isPending || updateDeviceMutation.isPending}
                                    >
                                        {addDeviceMutation.isPending || updateDeviceMutation.isPending
                                            ? "Saving..."
                                            : selectedDevice
                                            ? "Save Changes"
                                            : "Add Device"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Device Dialog */}
                    <AlertDialog open={isDeleteDeviceDialogOpen} onOpenChange={setIsDeleteDeviceDialogOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Device</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete this device? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setIsDeleteDeviceDialogOpen(false)}>
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={confirmDeleteDevice}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TabsContent>

                <TabsContent value="payment-types">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex-1 max-w-sm">
                            <Input
                                placeholder="Search payment types..."
                                value={paymentTypeSearchQuery}
                                onChange={(e) => setPaymentTypeSearchQuery(e.target.value)}
                                className="max-w-xs"
                            />
                        </div>
                        <Button onClick={() => {
                            setNewPaymentType({
                                name: "",
                                code: ""
                            });
                            setSelectedPaymentType(null);
                            setIsAddPaymentTypeDialogOpen(true);
                        }}>
                            Add Payment Type
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paymentTypes?.map((type) => (
                                    <TableRow key={type.id}>
                                        <TableCell>{type.name}</TableCell>
                                        <TableCell>{type.code}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditPaymentType(type)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700"
                                                    onClick={() => handleDeletePaymentType(type)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Add/Edit Payment Type Dialog */}
                    <Dialog open={isAddPaymentTypeDialogOpen} onOpenChange={setIsAddPaymentTypeDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {selectedPaymentType ? "Edit Payment Type" : "Add Payment Type"}
                                </DialogTitle>
                            </DialogHeader>

                            <form onSubmit={handleAddPaymentType}>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name*</Label>
                                        <Input
                                            id="name"
                                            value={newPaymentType.name}
                                            onChange={(e) => setNewPaymentType({
                                                ...newPaymentType,
                                                name: e.target.value
                                            })}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="code">Code*</Label>
                                        <Input
                                            id="code"
                                            value={newPaymentType.code}
                                            onChange={(e) => setNewPaymentType({
                                                ...newPaymentType,
                                                code: e.target.value
                                            })}
                                            required
                                        />
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsAddPaymentTypeDialogOpen(false);
                                            setNewPaymentType({
                                                name: "",
                                                code: ""
                                            });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit">
                                        {selectedPaymentType ? "Save Changes" : "Add Payment Type"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Payment Type Dialog */}
                    <AlertDialog open={isDeletePaymentTypeDialogOpen} onOpenChange={setIsDeletePaymentTypeDialogOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Payment Type</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete this payment type? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setIsDeletePaymentTypeDialogOpen(false)}>
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleConfirmDeletePaymentType}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TabsContent>

                <TabsContent value="dining-options">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex-1 max-w-sm">
                            <Input
                                placeholder="Search dining options..."
                                value={diningOptionSearchQuery}
                                onChange={(e) => setDiningOptionSearchQuery(e.target.value)}
                                className="max-w-xs"
                            />
                        </div>
                        <Button onClick={() => {
                            setNewDiningOption({
                                name: "",
                                storeId: undefined,
                                available: true,
                                isDefault: false
                            });
                            setSelectedDiningOption(null);
                            setIsAddDiningOptionDialogOpen(true);
                        }}>
                            Add Dining Option
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Store</TableHead>
                                    <TableHead>Available</TableHead>
                                    <TableHead>Default</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {diningOptions?.map((option) => (
                                    <TableRow key={option.id}>
                                        <TableCell>{option.name}</TableCell>
                                        <TableCell>{stores?.find(s => s.id === option.storeId)?.name}</TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={option.available}
                                                onCheckedChange={(checked) => {
                                                    updateDiningOptionMutation.mutate({
                                                        id: option.id,
                                                        data: {
                                                            ...option,
                                                            available: checked
                                                        }
                                                    });
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={option.isDefault}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        // When setting to default, pass the checked value
                                                        updateDiningOptionMutation.mutate({
                                                            id: option.id,
                                                            data: {
                                                                ...option,
                                                                isDefault: true
                                                            }
                                                        });
                                                    } else {
                                                        // Don't allow unchecking default directly
                                                        toast({
                                                            title: "Cannot unset default",
                                                            description: "Please set another dining option as default instead.",
                                                            variant: "default"
                                                        });
                                                    }
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditDiningOption(option)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700"
                                                    onClick={() => handleDeleteDiningOption(option)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Add/Edit Dining Option Dialog */}
                    <Dialog open={isAddDiningOptionDialogOpen} onOpenChange={setIsAddDiningOptionDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {selectedDiningOption ? "Edit Dining Option" : "Add Dining Option"}
                                </DialogTitle>
                            </DialogHeader>

                            <form onSubmit={handleAddDiningOption}>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name*</Label>
                                        <Input
                                            id="name"
                                            value={newDiningOption.name}
                                            onChange={(e) => setNewDiningOption({
                                                ...newDiningOption,
                                                name: e.target.value
                                            })}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="storeId">Store*</Label>
                                        <Select
                                            value={newDiningOption.storeId?.toString()}
                                            onValueChange={(value) => setNewDiningOption({
                                                ...newDiningOption,
                                                storeId: parseInt(value)
                                            })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a store" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {stores?.map((store) => (
                                                    <SelectItem key={store.id} value={store.id.toString()}>
                                                        {store.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Label htmlFor="available">Available</Label>
                                        <Switch
                                            id="available"
                                            checked={newDiningOption.available}
                                            onCheckedChange={(checked) => setNewDiningOption({
                                                ...newDiningOption,
                                                available: checked
                                            })}
                                        />
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Label htmlFor="isDefault">Default Option</Label>
                                        <Switch
                                            id="isDefault"
                                            checked={newDiningOption.isDefault}
                                            onCheckedChange={(checked) => setNewDiningOption({
                                                ...newDiningOption,
                                                isDefault: checked
                                            })}
                                        />
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsAddDiningOptionDialogOpen(false);
                                            setNewDiningOption({
                                                name: "",
                                                storeId: undefined,
                                                available: true,
                                                isDefault: false
                                            });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit">
                                        {selectedDiningOption ? "Save Changes" : "Add Dining Option"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Dining Option Dialog */}
                    <AlertDialog open={isDeleteDiningOptionDialogOpen} onOpenChange={setIsDeleteDiningOptionDialogOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Dining Option</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete this dining option? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setIsDeleteDiningOptionDialogOpen(false)}>
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleConfirmDeleteDiningOption}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TabsContent>
            </Tabs>
        </div>
    );
}
