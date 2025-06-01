import { useState } from "react";
import { Check, ChevronsUpDown, Shield, Users, Wrench, UserCheck, Search, Zap, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { AGENT_ROLES } from "@shared/schema";

interface RoleSelectorProps {
  selectedRole: string;
  onRoleChange: (role: string) => void;
  className?: string;
}

const roleIcons = {
  "content-creator": Users,
  "data-analyst": Search,
  "developer-assistant": Wrench,
  "customer-support": UserCheck,
  "research-assistant": Search,
  "automation-specialist": Zap,
  "admin-agent": Settings
};

const accessLevelColors = {
  basic: "bg-green-100 text-green-800",
  intermediate: "bg-blue-100 text-blue-800",
  advanced: "bg-purple-100 text-purple-800",
  admin: "bg-red-100 text-red-800"
};

export function RoleSelector({ selectedRole, onRoleChange, className }: RoleSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedRoleData = AGENT_ROLES[selectedRole];
  const Icon = selectedRoleData ? roleIcons[selectedRole as keyof typeof roleIcons] : Shield;

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto p-3"
          >
            <div className="flex items-center gap-3">
              {selectedRoleData && (
                <>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <div className="font-medium">{selectedRoleData.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedRoleData.description}
                    </div>
                  </div>
                </>
              )}
              {!selectedRoleData && (
                <span className="text-muted-foreground">Select a role...</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0">
          <Command>
            <CommandInput placeholder="Search roles..." />
            <CommandList>
              <CommandEmpty>No role found.</CommandEmpty>
              <CommandGroup>
                {Object.values(AGENT_ROLES).map((role) => {
                  const RoleIcon = roleIcons[role.id as keyof typeof roleIcons];
                  return (
                    <CommandItem
                      key={role.id}
                      value={role.id}
                      onSelect={(currentValue) => {
                        onRoleChange(currentValue === selectedRole ? "" : currentValue);
                        setOpen(false);
                      }}
                      className="p-4"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <RoleIcon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {role.name}
                              <Badge 
                                variant="secondary" 
                                className={cn("text-xs", accessLevelColors[role.accessLevel])}
                              >
                                {role.accessLevel}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {role.description}
                            </div>
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            selectedRole === role.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedRoleData && (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Role Details</h4>
            <Badge className={cn("text-xs", accessLevelColors[selectedRoleData.accessLevel])}>
              {selectedRoleData.accessLevel.charAt(0).toUpperCase() + selectedRoleData.accessLevel.slice(1)} Access
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="text-sm font-medium text-green-700 mb-2">Capabilities</h5>
              <div className="flex flex-wrap gap-1">
                {selectedRoleData.capabilities.map((capability) => (
                  <Badge key={capability} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    {capability.replace(/-/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
            
            {selectedRoleData.restrictions.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-orange-700 mb-2">Restrictions</h5>
                <div className="flex flex-wrap gap-1">
                  {selectedRoleData.restrictions.map((restriction) => (
                    <Badge key={restriction} variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                      {restriction.replace(/-/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}