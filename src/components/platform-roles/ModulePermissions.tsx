import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface ModulePermissionsProps {
  modules: string[];
  permissions: Record<string, any>;
  onChange: (permissions: Record<string, any>) => void;
}

export function ModulePermissions({ modules, permissions, onChange }: ModulePermissionsProps) {
  const togglePermission = (module: string, action: string, checked: boolean) => {
    const updated = { ...permissions };
    if (!updated[module]) {
      updated[module] = {};
    }
    updated[module][action] = checked;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure granular permissions for each module
      </p>
      <div className="grid gap-4">
        {modules.map((module) => (
          <Card key={module} className="p-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">{module}</Label>
              <div className="grid grid-cols-4 gap-4">
                {["view", "create", "update", "delete"].map((action) => (
                  <div key={action} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${module}-${action}`}
                      checked={permissions[module]?.[action] || false}
                      onCheckedChange={(checked) =>
                        togglePermission(module, action, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`${module}-${action}`}
                      className="text-sm font-normal capitalize cursor-pointer"
                    >
                      {action}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
