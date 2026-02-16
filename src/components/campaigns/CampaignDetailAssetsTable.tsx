 import { useState, useMemo } from "react";
 import { useNavigate } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Badge } from "@/components/ui/badge";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import {
   DropdownMenu,
   DropdownMenuCheckboxItem,
   DropdownMenuContent,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import { formatAssetDisplayCode } from "@/lib/assets/formatAssetDisplayCode";
 import { formatCurrency } from "@/utils/mediaAssets";
 import { getAssetStatusColor } from "@/utils/campaigns";
 import {
   Upload,
   Search,
   ArrowUpDown,
   ArrowUp,
   ArrowDown,
   X,
   Settings2,
 } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface CampaignAsset {
   id: string;
   asset_id: string;
   media_asset_code?: string;
   location: string;
   area?: string;
   city: string;
   media_type?: string;
   status: string;
   mounter_name?: string;
   total_sqft?: number;
   negotiated_rate?: number;
   card_rate?: number;
   rent_amount?: number;
   printing_charges?: number;
   mounting_charges?: number;
   booked_days?: number;
   start_date?: string;
   end_date?: string;
 }
 
 type SortField =
   | "media_asset_code"
   | "location"
   | "city"
   | "area"
   | "media_type"
   | "total_sqft"
   | "negotiated_rate"
   | "rent_amount"
   | "printing_charges"
   | "mounting_charges"
   | "status"
   | "mounter_name";
 
 type SortDirection = "asc" | "desc" | null;
 
 interface SortConfig {
   field: SortField | null;
   direction: SortDirection;
 }
 
 // Column definitions
 const ALL_COLUMNS = [
   { id: "asset_id", label: "Asset ID", defaultVisible: true },
   { id: "location", label: "Location", defaultVisible: true },
   { id: "city", label: "City", defaultVisible: true },
   { id: "area", label: "Area", defaultVisible: false },
   { id: "media_type", label: "Media Type", defaultVisible: false },
   { id: "total_sqft", label: "Sqft", defaultVisible: false },
   { id: "negotiated_rate", label: "Negotiated", defaultVisible: false },
   { id: "rent_amount", label: "Rent", defaultVisible: false },
   { id: "printing_charges", label: "Printing", defaultVisible: false },
   { id: "mounting_charges", label: "Mounting", defaultVisible: false },
   { id: "status", label: "Status", defaultVisible: true },
   { id: "mounter_name", label: "Mounter", defaultVisible: true },
   { id: "actions", label: "Actions", defaultVisible: true },
 ];
 
 interface CampaignDetailAssetsTableProps {
   assets: CampaignAsset[];
   campaignId: string;
   companyPrefix: string | null;
   companyName?: string;
 }
 
 export function CampaignDetailAssetsTable({
   assets,
   campaignId,
   companyPrefix,
   companyName,
 }: CampaignDetailAssetsTableProps) {
   const navigate = useNavigate();
   
   // State for filtering, sorting, and column visibility
   const [searchTerm, setSearchTerm] = useState("");
   const [cityFilter, setCityFilter] = useState<string>("all");
   const [areaFilter, setAreaFilter] = useState<string>("all");
   const [mediaTypeFilter, setMediaTypeFilter] = useState<string>("all");
   const [statusFilter, setStatusFilter] = useState<string>("all");
   const [sortConfig, setSortConfig] = useState<SortConfig>({ field: null, direction: null });
   const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
     new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id))
   );
 
   // Derive unique filter options
   const cities = useMemo(
     () => Array.from(new Set(assets.map((a) => a.city).filter(Boolean))).sort(),
     [assets]
   );
 
   const areas = useMemo(() => {
     let filtered = assets;
     if (cityFilter !== "all") {
       filtered = assets.filter((a) => a.city === cityFilter);
     }
     return Array.from(new Set(filtered.map((a) => a.area).filter(Boolean))).sort();
   }, [assets, cityFilter]);
 
   const mediaTypes = useMemo(
     () => Array.from(new Set(assets.map((a) => a.media_type).filter(Boolean))).sort(),
     [assets]
   );
 
   const statuses = useMemo(
     () => Array.from(new Set(assets.map((a) => a.status).filter(Boolean))).sort(),
     [assets]
   );
 
   // Filter and sort assets
   const filteredAndSortedAssets = useMemo(() => {
     let filtered = [...assets];
 
     // Search filter
     if (searchTerm) {
       const term = searchTerm.toLowerCase();
       filtered = filtered.filter(
         (asset) =>
           asset.asset_id?.toLowerCase().includes(term) ||
           asset.media_asset_code?.toLowerCase().includes(term) ||
           asset.location?.toLowerCase().includes(term) ||
           asset.area?.toLowerCase().includes(term) ||
           asset.mounter_name?.toLowerCase().includes(term)
       );
     }
 
     // City filter
     if (cityFilter !== "all") {
       filtered = filtered.filter((asset) => asset.city === cityFilter);
     }
 
     // Area filter
     if (areaFilter !== "all") {
       filtered = filtered.filter((asset) => asset.area === areaFilter);
     }
 
     // Media type filter
     if (mediaTypeFilter !== "all") {
       filtered = filtered.filter((asset) => asset.media_type === mediaTypeFilter);
     }
 
     // Status filter
     if (statusFilter !== "all") {
       filtered = filtered.filter((asset) => asset.status === statusFilter);
     }
 
     // Apply sorting
     if (sortConfig.field && sortConfig.direction) {
       filtered.sort((a, b) => {
         let aValue: any = a[sortConfig.field as keyof CampaignAsset] ?? "";
         let bValue: any = b[sortConfig.field as keyof CampaignAsset] ?? "";
 
         // Handle special cases
         if (sortConfig.field === "media_asset_code") {
           aValue = a.media_asset_code || a.asset_id || "";
           bValue = b.media_asset_code || b.asset_id || "";
         }
 
         // Numeric comparison for numeric fields
         if (
           ["total_sqft", "negotiated_rate", "rent_amount", "printing_charges", "mounting_charges"].includes(
             sortConfig.field!
           )
         ) {
           aValue = Number(aValue) || 0;
           bValue = Number(bValue) || 0;
           return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
         }
 
         // String comparison
         const comparison = String(aValue).localeCompare(String(bValue));
         return sortConfig.direction === "asc" ? comparison : -comparison;
       });
     }
 
     return filtered;
   }, [assets, searchTerm, cityFilter, areaFilter, mediaTypeFilter, statusFilter, sortConfig]);
 
   const handleSort = (field: SortField) => {
     setSortConfig((current) => {
       if (current.field === field) {
         if (current.direction === null) return { field, direction: "asc" };
         if (current.direction === "asc") return { field, direction: "desc" };
         return { field: null, direction: null };
       }
       return { field, direction: "asc" };
     });
   };
 
   const getSortIcon = (field: SortField) => {
     if (sortConfig.field !== field) {
       return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
     }
     if (sortConfig.direction === "asc") {
       return <ArrowUp className="ml-1 h-3 w-3 text-primary" />;
     }
     return <ArrowDown className="ml-1 h-3 w-3 text-primary" />;
   };
 
   const clearFilters = () => {
     setSearchTerm("");
     setCityFilter("all");
     setAreaFilter("all");
     setMediaTypeFilter("all");
     setStatusFilter("all");
     setSortConfig({ field: null, direction: null });
   };
 
   const toggleColumn = (columnId: string) => {
     const newVisible = new Set(visibleColumns);
     if (newVisible.has(columnId)) {
       newVisible.delete(columnId);
     } else {
       newVisible.add(columnId);
     }
     setVisibleColumns(newVisible);
   };
 
   const activeFilterCount = [
     searchTerm ? 1 : 0,
     cityFilter !== "all" ? 1 : 0,
     areaFilter !== "all" ? 1 : 0,
     mediaTypeFilter !== "all" ? 1 : 0,
     statusFilter !== "all" ? 1 : 0,
   ].reduce((a, b) => a + b, 0);
 
   const isColumnVisible = (id: string) => visibleColumns.has(id);
 
   return (
     <div className="space-y-4">
       {/* Header with title and view options */}
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
           <span className="font-semibold text-lg">Campaign Assets ({assets.length})</span>
           {filteredAndSortedAssets.length !== assets.length && (
             <Badge variant="outline">{filteredAndSortedAssets.length} shown</Badge>
           )}
         </div>
         <div className="flex items-center gap-2">
           {/* View Options */}
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="outline" size="sm">
                 <Settings2 className="h-4 w-4 mr-1" />
                 View
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="w-48">
               <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
               <DropdownMenuSeparator />
               {ALL_COLUMNS.map((col) => (
                 <DropdownMenuCheckboxItem
                   key={col.id}
                   checked={visibleColumns.has(col.id)}
                   onCheckedChange={() => toggleColumn(col.id)}
                 >
                   {col.label}
                 </DropdownMenuCheckboxItem>
               ))}
             </DropdownMenuContent>
           </DropdownMenu>
         </div>
       </div>
 
       {/* Filters Row 1: Search + Status + Clear */}
       <div className="flex gap-3 flex-wrap items-center">
         <div className="relative flex-1 min-w-[200px]">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Search by ID, location, area, or mounter..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="pl-9"
           />
         </div>
         <Select value={statusFilter} onValueChange={setStatusFilter}>
           <SelectTrigger className="w-[150px]">
             <SelectValue placeholder="Status" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">All Status</SelectItem>
             {statuses.map((status) => (
               <SelectItem key={status} value={status}>
                 {status}
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
         {activeFilterCount > 0 && (
           <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
             <X className="h-4 w-4 mr-1" />
             Clear ({activeFilterCount})
           </Button>
         )}
       </div>
 
       {/* Filters Row 2: City, Area, Media Type */}
       <div className="flex gap-3 flex-wrap">
         <Select
           value={cityFilter}
           onValueChange={(v) => {
             setCityFilter(v);
             setAreaFilter("all");
           }}
         >
           <SelectTrigger className="w-[160px]">
             <SelectValue placeholder="City" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">All Cities</SelectItem>
             {cities.map((city) => (
               <SelectItem key={city} value={city}>
                 {city}
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
         <Select value={areaFilter} onValueChange={setAreaFilter}>
           <SelectTrigger className="w-[180px]">
             <SelectValue placeholder="Area" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">All Areas</SelectItem>
             {areas.map((area) => (
               <SelectItem key={area} value={area}>
                 {area}
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
         <Select value={mediaTypeFilter} onValueChange={setMediaTypeFilter}>
           <SelectTrigger className="w-[180px]">
             <SelectValue placeholder="Media Type" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">All Types</SelectItem>
             {mediaTypes.map((type) => (
               <SelectItem key={type} value={type}>
                 {type}
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
       </div>
 
       {/* Table */}
       <div className="rounded-md border overflow-x-auto">
         <Table>
           <TableHeader>
             <TableRow>
               {isColumnVisible("asset_id") && (
                 <TableHead
                   className="cursor-pointer hover:bg-muted/50 select-none"
                   onClick={() => handleSort("media_asset_code")}
                 >
                   <div className="flex items-center">
                     Asset ID
                     {getSortIcon("media_asset_code")}
                   </div>
                 </TableHead>
               )}
               {isColumnVisible("location") && (
                 <TableHead
                   className="cursor-pointer hover:bg-muted/50 select-none"
                   onClick={() => handleSort("location")}
                 >
                   <div className="flex items-center">
                     Location
                     {getSortIcon("location")}
                   </div>
                 </TableHead>
               )}
               {isColumnVisible("city") && (
                 <TableHead
                   className="cursor-pointer hover:bg-muted/50 select-none"
                   onClick={() => handleSort("city")}
                 >
                   <div className="flex items-center">
                     City
                     {getSortIcon("city")}
                   </div>
                 </TableHead>
               )}
               {isColumnVisible("area") && (
                 <TableHead
                   className="cursor-pointer hover:bg-muted/50 select-none"
                   onClick={() => handleSort("area")}
                 >
                   <div className="flex items-center">
                     Area
                     {getSortIcon("area")}
                   </div>
                 </TableHead>
               )}
               {isColumnVisible("media_type") && (
                 <TableHead
                   className="cursor-pointer hover:bg-muted/50 select-none"
                   onClick={() => handleSort("media_type")}
                 >
                   <div className="flex items-center">
                     Media Type
                     {getSortIcon("media_type")}
                   </div>
                 </TableHead>
               )}
               {isColumnVisible("total_sqft") && (
                 <TableHead
                   className="cursor-pointer hover:bg-muted/50 select-none text-right"
                   onClick={() => handleSort("total_sqft")}
                 >
                   <div className="flex items-center justify-end">
                     Sqft
                     {getSortIcon("total_sqft")}
                   </div>
                 </TableHead>
               )}
               {isColumnVisible("negotiated_rate") && (
                 <TableHead
                   className="cursor-pointer hover:bg-muted/50 select-none text-right"
                   onClick={() => handleSort("negotiated_rate")}
                 >
                   <div className="flex items-center justify-end">
                     Negotiated
                     {getSortIcon("negotiated_rate")}
                   </div>
                 </TableHead>
               )}
               {isColumnVisible("rent_amount") && (
                 <TableHead
                   className="cursor-pointer hover:bg-muted/50 select-none text-right"
                   onClick={() => handleSort("rent_amount")}
                 >
                   <div className="flex items-center justify-end">
                     Rent
                     {getSortIcon("rent_amount")}
                   </div>
                 </TableHead>
               )}
               {isColumnVisible("printing_charges") && (
                 <TableHead
                   className="cursor-pointer hover:bg-muted/50 select-none text-right"
                   onClick={() => handleSort("printing_charges")}
                 >
                   <div className="flex items-center justify-end">
                     Printing
                     {getSortIcon("printing_charges")}
                   </div>
                 </TableHead>
               )}
               {isColumnVisible("mounting_charges") && (
                 <TableHead
                   className="cursor-pointer hover:bg-muted/50 select-none text-right"
                   onClick={() => handleSort("mounting_charges")}
                 >
                   <div className="flex items-center justify-end">
                     Mounting
                     {getSortIcon("mounting_charges")}
                   </div>
                 </TableHead>
               )}
               {isColumnVisible("status") && (
                 <TableHead
                   className="cursor-pointer hover:bg-muted/50 select-none"
                   onClick={() => handleSort("status")}
                 >
                   <div className="flex items-center">
                     Status
                     {getSortIcon("status")}
                   </div>
                 </TableHead>
               )}
               {isColumnVisible("mounter_name") && (
                 <TableHead
                   className="cursor-pointer hover:bg-muted/50 select-none"
                   onClick={() => handleSort("mounter_name")}
                 >
                   <div className="flex items-center">
                     Mounter
                     {getSortIcon("mounter_name")}
                   </div>
                 </TableHead>
               )}
               {isColumnVisible("actions") && (
                 <TableHead className="text-right">Actions</TableHead>
               )}
             </TableRow>
           </TableHeader>
           <TableBody>
             {filteredAndSortedAssets.length === 0 ? (
               <TableRow>
                 <TableCell
                   colSpan={ALL_COLUMNS.filter((c) => visibleColumns.has(c.id)).length}
                   className="h-24 text-center text-muted-foreground"
                 >
                   {assets.length === 0
                     ? "No assets in this campaign"
                     : "No assets match your filters"}
                 </TableCell>
               </TableRow>
             ) : (
                filteredAndSortedAssets.map((asset) => {
                  const hasProof = asset.status === 'PhotoUploaded' || asset.status === 'Verified' || asset.status === 'Completed';
                  const isInstalled = asset.status === 'Installed' || asset.status === 'Mounted';
                  const rowBorderClass = hasProof
                    ? 'border-l-4 border-l-green-500'
                    : isInstalled
                      ? 'border-l-4 border-l-amber-500'
                      : 'border-l-4 border-l-red-400';
                  return (
                  <TableRow key={asset.id} className={rowBorderClass}>
                   {isColumnVisible("asset_id") && (
                     <TableCell className="font-medium font-mono text-sm">
                       {formatAssetDisplayCode({
                         mediaAssetCode: asset.media_asset_code,
                         fallbackId: asset.asset_id,
                         companyPrefix,
                         companyName,
                       })}
                     </TableCell>
                   )}
                   {isColumnVisible("location") && (
                     <TableCell className="max-w-[200px] truncate" title={asset.location}>
                       {asset.location}
                     </TableCell>
                   )}
                   {isColumnVisible("city") && <TableCell>{asset.city}</TableCell>}
                   {isColumnVisible("area") && <TableCell>{asset.area || "-"}</TableCell>}
                   {isColumnVisible("media_type") && (
                     <TableCell>{asset.media_type || "-"}</TableCell>
                   )}
                   {isColumnVisible("total_sqft") && (
                     <TableCell className="text-right">
                       {asset.total_sqft ? asset.total_sqft.toFixed(0) : "-"}
                     </TableCell>
                   )}
                   {isColumnVisible("negotiated_rate") && (
                     <TableCell className="text-right">
                       {asset.negotiated_rate ? formatCurrency(asset.negotiated_rate) : "-"}
                     </TableCell>
                   )}
                   {isColumnVisible("rent_amount") && (
                     <TableCell className="text-right">
                       {asset.rent_amount ? formatCurrency(asset.rent_amount) : "-"}
                     </TableCell>
                   )}
                   {isColumnVisible("printing_charges") && (
                     <TableCell className="text-right">
                       {asset.printing_charges ? formatCurrency(asset.printing_charges) : "-"}
                     </TableCell>
                   )}
                   {isColumnVisible("mounting_charges") && (
                     <TableCell className="text-right">
                       {asset.mounting_charges ? formatCurrency(asset.mounting_charges) : "-"}
                     </TableCell>
                   )}
                   {isColumnVisible("status") && (
                     <TableCell>
                       <Badge className={getAssetStatusColor(asset.status)}>
                         {asset.status}
                       </Badge>
                     </TableCell>
                   )}
                   {isColumnVisible("mounter_name") && (
                     <TableCell>{asset.mounter_name || "-"}</TableCell>
                   )}
                   {isColumnVisible("actions") && (
                     <TableCell className="text-right">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => navigate(`/mobile/upload/${campaignId}/${asset.id}`)}
                       >
                         <Upload className="mr-2 h-4 w-4" />
                         Upload
                       </Button>
                     </TableCell>
                   )}
                  </TableRow>
                  );
                })
             )}
           </TableBody>
         </Table>
       </div>
     </div>
   );
 }