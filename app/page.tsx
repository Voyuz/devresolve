import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Bug } from "lucide-react";
import Link from "next/link";

// Data dummy sementara sebelum disambungkan ke Supabase
const mockIssues = [
  {
    id: "ISS-001",
    title: "Kalkulasi total keranjang salah saat apply kupon",
    status: "fix_ready",
    date: "2026-09-26",
  },
  {
    id: "ISS-002",
    title: "Tombol submit form registrasi tidak responsif di mobile",
    status: "analyzing",
    date: "2026-09-26",
  },
  {
    id: "ISS-003",
    title: "Gagal fetch data profile user setelah login (Timeout)",
    status: "open",
    date: "2026-09-25",
  },
];

// Fungsi helper pemetaan palet warna kustom untuk badge status
const getStatusBadge = (status: string) => {
  switch (status) {
    case "fix_ready":
      // Warna Hijau Mint dari palet
      return <Badge className="bg-[#80c8bc] hover:bg-[#80c8bc]/80 text-white">Fix Ready</Badge>;
    case "analyzing":
      // Warna Cokelat dari palet
      return <Badge className="bg-[#ce8f5a] hover:bg-[#ce8f5a]/80 text-white animate-pulse">Bob Analyzing...</Badge>;
    case "open":
      // Warna Kuning Pasir dari palet
      return <Badge className="bg-[#efd199] hover:bg-[#efd199]/80 text-stone-800">Open</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function Dashboard() {
  return (
    <div className="container mx-auto py-10 space-y-8 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          {/* Warna Biru Sabak (Slate Blue) dari palet untuk judul */}
          <h1 className="text-3xl font-bold tracking-tight text-[#6287a2]">DevResolve Command Center</h1>
          <p className="text-muted-foreground mt-2">
            Pantau laporan bug dan biarkan IBM Bob 2.0 yang menganalisisnya.
          </p>
        </div>
        {/* Warna Cyan dari palet untuk tombol utama */}
        <Button className="bg-[#5ec0ca] hover:bg-[#5ec0ca]/80 text-white shadow-md">
          <Bug className="mr-2 h-4 w-4" /> Lapor Bug Baru
        </Button>
      </div>

      {/* Aksen garis atas menggunakan warna Cyan */}
      <Card className="border-t-4 border-t-[#5ec0ca] shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#6287a2]">Antrean Tiket (Urgency Heatmap)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Judul Masalah</TableHead>
                <TableHead>Status AI</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockIssues.map((issue) => (
                <TableRow key={issue.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-medium text-slate-600">{issue.id}</TableCell>
                  <TableCell className="font-semibold text-slate-800">{issue.title}</TableCell>
                  <TableCell>{getStatusBadge(issue.status)}</TableCell>
                  <TableCell className="text-slate-500">{issue.date}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/issue/${issue.id}`}>
                      {/* Warna Slate Blue untuk tombol aksi sekunder */}
                      <Button variant="ghost" size="sm" className="text-[#6287a2] hover:text-[#6287a2] hover:bg-[#6287a2]/10">
                        Tinjau <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}