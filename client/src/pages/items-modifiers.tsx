import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Modifier, ModifierOption } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";

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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from "@/components/ui/collapsible";

interface ModifierWithOptions extends Modifier {
  options?: ModifierOption[];
}

export default function ItemsModifiersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State variables for modifiers
  const [isAddModifierDialogOpen, setIsAddModifierDialogOpen] = useState(false);
  const [isEditModifierDialogOpen, setIsEditModifierDialogOpen] = useState(false);
  const [isDeleteModifierDialogOpen, setIsDeleteModifierDialogOpen] = useState(false);
  const [selectedModifier, setSelectedModifier] = useState<ModifierWithOptions | null>(null);
  const [newModifier, setNewModifier] = useState({ name: "" });

  // State variables for options
  const [isAddOptionDialogOpen, setIsAddOptionDialogOpen] = useState(false);
  const [isEditOptionDialogOpen, setIsEditOptionDialogOpen] = useState(false);
  const [isDeleteOptionDialogOpen, setIsDeleteOptionDialogOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ModifierOption | null>(null);
  const [newOption, setNewOption] = useState({ name: "", price: 0 });

  // Track expanded modifiers
  const [expandedModifiers, setExpandedModifiers] = useState<Record<number, boolean>>({});

  // Fetch modifiers
  const {
    data: modifiers,
    isLoading: isLoadingModifiers,
    isError: isModifiersError
  } = useQuery<ModifierWithOptions[]>({
    queryKey: ["/api/modifiers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/modifiers");
      const modifiersData = await response.json();

      // Fetch options for each modifier
      const modifiersWithOptions = await Promise.all(
        modifiersData.map(async (modifier: Modifier) => {
          const optionsResponse = await apiRequest("GET", `/api/modifiers/${modifier.id}/options`);
          const options = await optionsResponse.json();
          return { ...modifier, options };
        })
      );

      return modifiersWithOptions;
    }
  });

  // Set all modifiers to be expanded when data is loaded
  React.useEffect(() => {
    if (modifiers && modifiers.length > 0) {
      const initialExpandedState: Record<number, boolean> = {};
      modifiers.forEach((modifier) => {
        initialExpandedState[modifier.id] = true; // Set all modifiers to be expanded by default
      });
      setExpandedModifiers(initialExpandedState);
    }
  }, [modifiers]);

  // Add modifier mutation
  const addModifierMutation = useMutation({
    mutationFn: async (modifier: { name: string }) => {
      const response = await apiRequest("POST", "/api/modifiers", modifier);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modifiers"] });
      setIsAddModifierDialogOpen(false);
      setNewModifier({ name: "" });
      toast({
        title: "Modifier Added",
        description: "The modifier has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add modifier",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Update modifier mutation
  const updateModifierMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const response = await apiRequest("PUT", `/api/modifiers/${id}`, { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modifiers"] });
      setIsEditModifierDialogOpen(false);
      setSelectedModifier(null);
      toast({
        title: "Modifier Updated",
        description: "The modifier has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update modifier",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Delete modifier mutation
  const deleteModifierMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/modifiers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modifiers"] });
      setIsDeleteModifierDialogOpen(false);
      setSelectedModifier(null);
      toast({
        title: "Modifier Deleted",
        description: "The modifier and its options have been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete modifier",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Add option mutation
  const addOptionMutation = useMutation({
    mutationFn: async ({ modifierId, option }: { modifierId: number; option: { name: string; price: number } }) => {
      const response = await apiRequest("POST", `/api/modifiers/${modifierId}/options`, option);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modifiers"] });
      setIsAddOptionDialogOpen(false);
      setNewOption({ name: "", price: 0 });
      toast({
        title: "Option Added",
        description: "The option has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add option",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Update option mutation
  const updateOptionMutation = useMutation({
    mutationFn: async ({ modifierId, optionId, option }: {
      modifierId: number;
      optionId: number;
      option: { name: string; price: string }
    }) => {
      const response = await apiRequest(
        "PUT",
        `/api/modifiers/${modifierId}/options/${optionId}`,
        option
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modifiers"] });
      setIsEditOptionDialogOpen(false);
      setSelectedOption(null);
      toast({
        title: "Option Updated",
        description: "The option has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update option",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Delete option mutation
  const deleteOptionMutation = useMutation({
    mutationFn: async ({ modifierId, optionId }: { modifierId: number; optionId: number }) => {
      const response = await apiRequest(
        "DELETE",
        `/api/modifiers/${modifierId}/options/${optionId}`
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modifiers"] });
      setIsDeleteOptionDialogOpen(false);
      setSelectedOption(null);
      toast({
        title: "Option Deleted",
        description: "The option has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete option",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Toggle modifier expansion
  const toggleModifier = (modifierId: number) => {
    setExpandedModifiers(prev => ({
      ...prev,
      [modifierId]: !prev[modifierId]
    }));
  };

  // Update the display of price
  const formatPrice = (price: string) => {
    return Number(price).toFixed(2);
  };

  // Handle modifier actions
  const handleAddModifier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModifier.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a modifier name",
        variant: "destructive"
      });
      return;
    }
    addModifierMutation.mutate(newModifier);
  };

  const handleEditModifier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModifier || !selectedModifier.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a modifier name",
        variant: "destructive"
      });
      return;
    }
    updateModifierMutation.mutate({ id: selectedModifier.id, name: selectedModifier.name });
  };

  const handleDeleteModifier = () => {
    if (selectedModifier) {
      deleteModifierMutation.mutate(selectedModifier.id);
    }
  };

  // Handle option actions
  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModifier) return;

    if (!newOption.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an option name",
        variant: "destructive"
      });
      return;
    }

    addOptionMutation.mutate({
      modifierId: selectedModifier.id,
      option: newOption
    });
  };

  const handleEditOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModifier || !selectedOption) return;

    if (!selectedOption.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an option name",
        variant: "destructive"
      });
      return;
    }

    updateOptionMutation.mutate({
      modifierId: selectedModifier.id,
      optionId: selectedOption.id,
      option: {
        name: selectedOption.name,
        price: selectedOption.price.toString()
      }
    });
  };

  const handleDeleteOption = () => {
    if (!selectedModifier || !selectedOption) return;

    deleteOptionMutation.mutate({
      modifierId: selectedModifier.id,
      optionId: selectedOption.id
    });
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold mb-2 sm:mb-0">Modifiers</h1>
        <Button onClick={() => setIsAddModifierDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Modifier
        </Button>
      </div>

      {/* Modifiers List */}
      <div className="space-y-4">
        {isLoadingModifiers ? (
          // Loading skeletons
          Array(3).fill(0).map((_, index) => (
            <Card key={index}>
              <CardHeader className="p-4">
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : isModifiersError ? (
          <Card>
            <CardContent className="p-4 text-center text-red-500">
              Failed to load modifiers. Please try again.
            </CardContent>
          </Card>
        ) : modifiers && modifiers.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center text-gray-500">
              No modifiers found. Start by adding a modifier.
            </CardContent>
          </Card>
        ) : (
          modifiers && modifiers.map((modifier) => (
            <Card key={modifier.id} className="shadow-sm">
              <Collapsible
                open={expandedModifiers[modifier.id]}
                onOpenChange={() => toggleModifier(modifier.id)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle>{modifier.name}</CardTitle>
                      <CardDescription>
                        {modifier.options?.length || 0} options
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedModifier(modifier);
                          setIsEditModifierDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-red-500 hover:text-white hover:bg-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedModifier(modifier);
                          setIsDeleteModifierDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                        >
                          {expandedModifiers[modifier.id] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="p-4 pt-0">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-medium">Options</h3>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedModifier(modifier);
                          setIsAddOptionDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {modifier.options && modifier.options.length > 0 ? (
                        modifier.options.map((option) => (
                          <div
                            key={option.id}
                            className="flex items-center justify-between p-2 rounded-md bg-gray-50"
                          >
                            <div>
                              <span className="font-medium">{option.name}</span>
                              <span className="ml-2 text-sm text-gray-500">
                                ${formatPrice(option.price)}
                              </span>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedModifier(modifier);
                                  setSelectedOption(option);
                                  setIsEditOptionDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-red-500 hover:text-white hover:bg-red-500"
                                onClick={() => {
                                  setSelectedModifier(modifier);
                                  setSelectedOption(option);
                                  setIsDeleteOptionDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-2">
                          No options added yet.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        )}
      </div>

      {/* Add Modifier Dialog */}
      <Dialog open={isAddModifierDialogOpen} onOpenChange={setIsAddModifierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Modifier</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddModifier}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="modifierName">Modifier Name*</Label>
                <Input
                  id="modifierName"
                  value={newModifier.name}
                  onChange={(e) => setNewModifier({ name: e.target.value })}
                  placeholder="e.g., Size, Temperature, Extra toppings"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddModifierDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addModifierMutation.isPending}>
                {addModifierMutation.isPending ? "Adding..." : "Add Modifier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modifier Dialog */}
      <Dialog open={isEditModifierDialogOpen} onOpenChange={setIsEditModifierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Modifier</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditModifier}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editModifierName">Modifier Name*</Label>
                <Input
                  id="editModifierName"
                  value={selectedModifier?.name || ''}
                  onChange={(e) => setSelectedModifier(prev => prev ? {...prev, name: e.target.value} : null)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModifierDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateModifierMutation.isPending}>
                {updateModifierMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Modifier Dialog */}
      <AlertDialog open={isDeleteModifierDialogOpen} onOpenChange={setIsDeleteModifierDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Modifier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this modifier? This will also delete all its options.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModifier}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Option Dialog */}
      <Dialog open={isAddOptionDialogOpen} onOpenChange={setIsAddOptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Option to {selectedModifier?.name}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddOption}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="optionName">Option Name*</Label>
                <Input
                  id="optionName"
                  value={newOption.name}
                  onChange={(e) => setNewOption(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Small, Hot, Extra cheese"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="optionPrice">Price</Label>
                <Input
                  id="optionPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newOption.price}
                  onChange={(e) => setNewOption(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOptionDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addOptionMutation.isPending}>
                {addOptionMutation.isPending ? "Adding..." : "Add Option"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Option Dialog */}
      <Dialog open={isEditOptionDialogOpen} onOpenChange={setIsEditOptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Option</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditOption}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editOptionName">Option Name*</Label>
                <Input
                  id="editOptionName"
                  value={selectedOption?.name || ''}
                  onChange={(e) => setSelectedOption(prev => prev ? {...prev, name: e.target.value} : null)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editOptionPrice">Price</Label>
                <Input
                  id="editOptionPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={selectedOption ? Number(selectedOption.price) : 0}
                  onChange={(e) => setSelectedOption(prev => prev ? {...prev, price: e.target.value} : null)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOptionDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateOptionMutation.isPending}>
                {updateOptionMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Option Dialog */}
      <AlertDialog open={isDeleteOptionDialogOpen} onOpenChange={setIsDeleteOptionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Option</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this option? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOption}
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
