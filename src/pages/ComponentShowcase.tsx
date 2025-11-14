import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/ui/page-container";
import { ResponsiveGrid, ResponsiveStack } from "@/components/ui/responsive-grid";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveCard } from "@/components/ui/responsive-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonCard, SkeletonTable, SkeletonForm, SkeletonList, SkeletonStats } from "@/components/ui/loading-skeleton";
import { FormBuilder, FormBuilderSection } from "@/components/forms/FormBuilder";
import { toast } from "@/hooks/use-toast";
import { 
  Home, Settings, User, Mail, Phone, FileText, 
  AlertCircle, CheckCircle, Info, AlertTriangle,
  Copy, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ComponentShowcase() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast({
      title: "Code copied!",
      description: "Component code has been copied to clipboard.",
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <div className="relative">
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono">
        <code>{code}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2"
        onClick={() => copyCode(code, id)}
      >
        {copiedCode === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );

  const formSections: FormBuilderSection[] = [
    {
      title: "Personal Information",
      description: "Basic contact details",
      fields: [
        { name: "firstName", label: "First Name", type: "text", required: true, colSpan: 6 },
        { name: "lastName", label: "Last Name", type: "text", required: true, colSpan: 6 },
        { name: "email", label: "Email", type: "email", required: true, colSpan: 6 },
        { name: "phone", label: "Phone", type: "tel", colSpan: 6 },
      ],
    },
    {
      title: "Preferences",
      fields: [
        { 
          name: "role", 
          label: "Role", 
          type: "select", 
          required: true,
          options: [
            { label: "Admin", value: "admin" },
            { label: "User", value: "user" },
            { label: "Viewer", value: "viewer" },
          ]
        },
        { name: "notifications", label: "Enable Notifications", type: "switch" },
        { name: "newsletter", label: "Subscribe to newsletter", type: "checkbox" },
      ],
    },
  ];

  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title="UI Component Showcase"
        description="Interactive examples of all UI components with copy-paste code snippets"
      />

      <Tabs defaultValue="buttons" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="buttons">Buttons</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="states">States</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="formbuilder">FormBuilder</TabsTrigger>
        </TabsList>

        {/* Buttons Tab */}
        <TabsContent value="buttons" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Button Variants</CardTitle>
              <CardDescription>Different button styles and sizes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-4">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="hero">Hero</Button>
                <Button variant="gradient">Gradient</Button>
              </div>

              <CodeBlock
                id="buttons-variants"
                code={`<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Destructive</Button>`}
              />

              <Separator />

              <div className="flex flex-wrap gap-4 items-center">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon"><Home className="w-4 h-4" /></Button>
              </div>

              <CodeBlock
                id="buttons-sizes"
                code={`<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Home className="w-4 h-4" /></Button>`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Controls</CardTitle>
              <CardDescription>Input fields and form elements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="input-example">Text Input</Label>
                  <Input id="input-example" placeholder="Enter text..." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="textarea-example">Textarea</Label>
                  <Textarea id="textarea-example" placeholder="Enter description..." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="select-example">Select</Label>
                  <Select>
                    <SelectTrigger id="select-example">
                      <SelectValue placeholder="Choose option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Option 1</SelectItem>
                      <SelectItem value="2">Option 2</SelectItem>
                      <SelectItem value="3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="switch-example" />
                  <Label htmlFor="switch-example">Enable feature</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="checkbox-example" />
                  <Label htmlFor="checkbox-example">Accept terms and conditions</Label>
                </div>

                <RadioGroup defaultValue="option-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option-1" id="radio-1" />
                    <Label htmlFor="radio-1">Option 1</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option-2" id="radio-2" />
                    <Label htmlFor="radio-2">Option 2</Label>
                  </div>
                </RadioGroup>
              </div>

              <CodeBlock
                id="form-controls"
                code={`<Label htmlFor="input">Text Input</Label>
<Input id="input" placeholder="Enter text..." />

<Label htmlFor="select">Select</Label>
<Select>
  <SelectTrigger id="select">
    <SelectValue placeholder="Choose option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
  </SelectContent>
</Select>

<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms</Label>
</div>`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cards Tab */}
        <TabsContent value="cards" className="space-y-6">
          <ResponsiveGrid cols={{ default: 1, md: 2, lg: 3 }} gap="md">
            <Card>
              <CardHeader>
                <CardTitle>Basic Card</CardTitle>
                <CardDescription>Simple card with header and content</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Card content goes here.</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">Action</Button>
              </CardFooter>
            </Card>

            <ResponsiveCard
              title="Responsive Card"
              description="Card with built-in responsive features"
              headerAction={<Badge>New</Badge>}
              footer={<Button className="w-full">Learn More</Button>}
            >
              <p className="text-sm">Enhanced card component with automatic layout adjustments.</p>
            </ResponsiveCard>

            <Card>
              <CardHeader>
                <CardTitle>Icon Card</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-xs text-muted-foreground">contact@example.com</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ResponsiveGrid>

          <CodeBlock
            id="cards"
            code={`<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

<ResponsiveCard
  title="Title"
  description="Description"
  headerAction={<Badge>New</Badge>}
  footer={<Button>Action</Button>}
>
  Content
</ResponsiveCard>`}
          />
        </TabsContent>

        {/* Tables Tab */}
        <TabsContent value="tables" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Table</CardTitle>
              <CardDescription>Structured data display</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">John Doe</TableCell>
                    <TableCell><Badge variant="secondary">Active</Badge></TableCell>
                    <TableCell>Admin</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Jane Smith</TableCell>
                    <TableCell><Badge>Active</Badge></TableCell>
                    <TableCell>User</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <CodeBlock
            id="table"
            code={`<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell><Badge>Active</Badge></TableCell>
    </TableRow>
  </TableBody>
</Table>`}
          />
        </TabsContent>

        {/* States Tab */}
        <TabsContent value="states" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Loading States</CardTitle>
              <CardDescription>Skeleton loaders for different layouts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Button onClick={() => setShowSkeleton(!showSkeleton)}>
                  Toggle Skeleton
                </Button>
              </div>

              {showSkeleton && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Skeleton Cards</h4>
                    <ResponsiveGrid cols={{ default: 1, md: 3 }}>
                      <SkeletonCard count={3} />
                    </ResponsiveGrid>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">Skeleton Table</h4>
                    <SkeletonTable rows={5} columns={4} />
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">Skeleton Form</h4>
                    <SkeletonForm fields={4} />
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">Skeleton List</h4>
                    <SkeletonList items={5} withAvatar />
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">Skeleton Stats</h4>
                    <SkeletonStats count={4} />
                  </div>
                </div>
              )}

              <CodeBlock
                id="skeleton-loaders"
                code={`import { SkeletonCard, SkeletonTable, SkeletonForm, SkeletonList } from "@/components/ui/loading-skeleton";

<SkeletonCard count={3} />
<SkeletonTable rows={5} columns={4} />
<SkeletonForm fields={4} />
<SkeletonList items={5} withAvatar />
<SkeletonStats count={4} />`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Empty & Error States</CardTitle>
              <CardDescription>User-friendly state components</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <EmptyState
                icon={FileText}
                title="No data found"
                description="Get started by creating your first item"
                action={{ label: "Create Item", onClick: () => toast({ title: "Action clicked" }) }}
              />

              <Separator />

              <ErrorState
                title="Something went wrong"
                message="We couldn't load the data. Please try again."
                onRetry={() => toast({ title: "Retrying..." })}
                variant="inline"
              />

              <CodeBlock
                id="states"
                code={`import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

<EmptyState
  icon={FileText}
  title="No data found"
  description="Get started by creating your first item"
  action={{ label: "Create Item", onClick: handleCreate }}
/>

<ErrorState
  title="Something went wrong"
  message="Error message here"
  onRetry={handleRetry}
/>`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alerts & Badges</CardTitle>
              <CardDescription>User feedback components</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Information</AlertTitle>
                  <AlertDescription>This is an informational alert message.</AlertDescription>
                </Alert>

                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>Something went wrong. Please try again.</AlertDescription>
                </Alert>

                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </div>

                <div>
                  <Label className="mb-2 block">Progress Bar</Label>
                  <Progress value={66} className="w-full" />
                </div>
              </div>

              <CodeBlock
                id="feedback"
                code={`<Alert>
  <Info className="h-4 w-4" />
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>Message here</AlertDescription>
</Alert>

<Badge>Default</Badge>
<Badge variant="destructive">Error</Badge>

<Progress value={66} />`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Layout Components</CardTitle>
              <CardDescription>Responsive grids and stacks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Responsive Grid</h4>
                <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }} gap="md">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-muted p-4 rounded-lg text-center">
                      Item {i}
                    </div>
                  ))}
                </ResponsiveGrid>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3">Responsive Stack</h4>
                <ResponsiveStack spacing="md" divider>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="py-2">Stack Item {i}</div>
                  ))}
                </ResponsiveStack>
              </div>

              <CodeBlock
                id="layout"
                code={`import { ResponsiveGrid, ResponsiveStack } from "@/components/ui/responsive-grid";
import { PageContainer, PageHeader } from "@/components/ui/page-container";

<ResponsiveGrid cols={{ default: 1, md: 2, lg: 4 }} gap="md">
  <div>Item 1</div>
  <div>Item 2</div>
</ResponsiveGrid>

<ResponsiveStack spacing="md" divider>
  <div>Item 1</div>
  <div>Item 2</div>
</ResponsiveStack>

<PageContainer maxWidth="2xl">
  <PageHeader title="Title" description="Description" />
</PageContainer>`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* FormBuilder Tab */}
        <TabsContent value="formbuilder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>FormBuilder System</CardTitle>
              <CardDescription>Powerful form builder with automatic validation</CardDescription>
            </CardHeader>
            <CardContent>
              <FormBuilder
                sections={formSections}
                onSubmit={(data) => {
                  console.log(data);
                  toast({
                    title: "Form submitted!",
                    description: "Check console for values",
                  });
                }}
                layout="grid"
                showCard={false}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>FormBuilder Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock
                id="formbuilder"
                code={`import { FormBuilder, FormBuilderSection } from "@/components/forms/FormBuilder";

const sections: FormBuilderSection[] = [
  {
    title: "Personal Information",
    fields: [
      { name: "firstName", label: "First Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { 
        name: "role", 
        label: "Role", 
        type: "select",
        options: [
          { label: "Admin", value: "admin" },
          { label: "User", value: "user" }
        ]
      },
      { name: "notifications", label: "Enable Notifications", type: "switch" }
    ]
  }
];

<FormBuilder
  sections={sections}
  onSubmit={(data) => console.log(data)}
  layout="two-column"
  submitLabel="Save"
  cancelLabel="Cancel"
  onCancel={() => navigate(-1)}
/>`}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
