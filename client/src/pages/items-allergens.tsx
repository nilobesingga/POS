import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Pencil, Trash2 } from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Interface for allergen types
interface Allergen {
  id: number;
  name: string;
  description: string | null;
  severity: "mild" | "moderate" | "severe";
  createdAt: string;
  updatedAt: string;
}

type NewAllergen = {
  name: string;
  description: string;
  severity: "mild" | "moderate" | "severe";
};

export default function ItemsAllergensPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State variables
  const [isAddAllergenDialogOpen, setIsAddAllergenDialogOpen] = useState(false);
  const [isEditAllergenDialogOpen, setIsEditAllergenDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAllergen, setSelectedAllergen] = useState<Allergen | null>(null);
  const [newAllergen, setNewAllergen] = useState<NewAllergen>({
    name: "",
    description: "",
    severity: "moderate"
  });

  // Fetch allergens
  const {
    data: allergens,
    isLoading: isLoadingAllergens,
    isError: isAllergensError
  } = useQuery<Allergen[]>({
    queryKey: ["/api/allergens"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/allergens");
      return response.json();
    }
  });

  // Add allergen mutation
  const addAllergenMutation = useMutation({
    mutationFn: async (allergen: NewAllergen) => {
      const response = await apiRequest("POST", "/api/allergens", allergen);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/allergens"] });
      setIsAddAllergenDialogOpen(false);
      resetNewAllergen();
      toast({
        title: "Allergen Added",
        description: "The allergen has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add allergen",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Update allergen mutation
  const updateAllergenMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<NewAllergen> }) => {
      const response = await apiRequest("PUT", `/api/allergens/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/allergens"] });
      setIsEditAllergenDialogOpen(false);
      setSelectedAllergen(null);
      toast({
        title: "Allergen Updated",
        description: "The allergen has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update allergen",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Delete allergen mutation
  const deleteAllergenMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/allergens/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/allergens"] });
      setIsDeleteDialogOpen(false);
      setSelectedAllergen(null);
      toast({
        title: "Allergen Deleted",
        description: "The allergen has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete allergen",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Reset form values
  const resetNewAllergen = () => {
    setNewAllergen({
      name: "",
      description: "",
      severity: "moderate"
    });
  };

  // Handle input change for new allergen
  const handleAllergenChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewAllergen(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle allergen severity change
  const handleSeverityChange = (value: "mild" | "moderate" | "severe") => {
    setNewAllergen(prev => ({
      ...prev,
      severity: value
    }));
  };

  // Handle selected allergen input change
  const handleSelectedAllergenChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSelectedAllergen(prev => prev ? {
      ...prev,
      [name]: value
    } : null);
  };

  // Handle selected allergen severity change
  const handleSelectedAllergenSeverityChange = (value: "mild" | "moderate" | "severe") => {
    setSelectedAllergen(prev => prev ? {
      ...prev,
      severity: value
    } : null);
  };

  // Handle add allergen
  const handleAddAllergen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAllergen.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an allergen name",
        variant: "destructive"
      });
      return;
    }
    addAllergenMutation.mutate(newAllergen);
  };

  // Handle edit allergen
  const handleEditAllergen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllergen || !selectedAllergen.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an allergen name",
        variant: "destructive"
      });
      return;
    }

    updateAllergenMutation.mutate({
      id: selectedAllergen.id,
      data: {
        name: selectedAllergen.name,
        description: selectedAllergen.description || "",
        severity: selectedAllergen.severity
      }
    });
  };

  // Handle delete allergen
  const handleDeleteAllergen = () => {
    if (selectedAllergen) {
      deleteAllergenMutation.mutate(selectedAllergen.id);
    }
  };

  // Open edit dialog
  const openEditDialog = (allergen: Allergen) => {
    setSelectedAllergen(allergen);
    setIsEditAllergenDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (allergen: Allergen) => {
    setSelectedAllergen(allergen);
    setIsDeleteDialogOpen(true);
  };

  // Helper function to render severity badge
  const renderSeverityBadge = (severity: string) => {
    switch (severity) {
      case "mild":
        return <Badge variant="outline">Mild</Badge>;
      case "moderate":
        return <Badge variant="secondary">Moderate</Badge>;
      case "severe":
        return <Badge variant="destructive">Severe</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Food Allergens</h1>
          <p className="text-muted-foreground">
            Manage allergen information for your menu items to inform customers with dietary restrictions.
          </p>
        </div>
        <Button onClick={() => setIsAddAllergenDialogOpen(true)} className="mt-4 sm:mt-0">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Add Allergen
        </Button>
      </div>

      {/* Allergens Table */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Allergen</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingAllergens ? (
              // Loading state
              Array(5).fill(0).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))
            ) : isAllergensError ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-red-500">
                  Failed to load allergens. Please try again.
                </TableCell>
              </TableRow>
            ) : (!allergens || allergens.length === 0) ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                  No allergens found. Start by adding an allergen.
                </TableCell>
              </TableRow>
            ) : (
              allergens.map((allergen) => (
                <TableRow key={allergen.id}>
                  <TableCell className="font-medium">{allergen.name}</TableCell>
                  <TableCell className="text-muted-foreground">{allergen.description || "-"}</TableCell>
                  <TableCell>{renderSeverityBadge(allergen.severity)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(allergen)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => openDeleteDialog(allergen)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Allergen Dialog */}
      <Dialog open={isAddAllergenDialogOpen} onOpenChange={setIsAddAllergenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Allergen</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddAllergen}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Allergen Name*</Label>
                <Input
                  id="name"
                  name="name"
                  value={newAllergen.name}
                  onChange={handleAllergenChange}
                  placeholder="e.g., Peanuts, Gluten, Shellfish"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={newAllergen.description}
                  onChange={handleAllergenChange}
                  placeholder="Optional details about this allergen"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Severity Level</Label>
                <Select
                  value={newAllergen.severity}
                  onValueChange={(value) => handleSeverityChange(value as "mild" | "moderate" | "severe")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddAllergenDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addAllergenMutation.isPending}>
                {addAllergenMutation.isPending ? "Adding..." : "Add Allergen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Allergen Dialog */}
      <Dialog open={isEditAllergenDialogOpen} onOpenChange={setIsEditAllergenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Allergen</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditAllergen}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Allergen Name*</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={selectedAllergen?.name || ''}
                  onChange={handleSelectedAllergenChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  name="description"
                  value={selectedAllergen?.description || ''}
                  onChange={handleSelectedAllergenChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-severity">Severity Level</Label>
                <Select
                  value={selectedAllergen?.severity || 'moderate'}
                  onValueChange={(value) => handleSelectedAllergenSeverityChange(value as "mild" | "moderate" | "severe")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditAllergenDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateAllergenMutation.isPending}>
                {updateAllergenMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Allergen</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this allergen? This action cannot be undone.
              Any products associated with this allergen will need to be updated separately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllergen}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
