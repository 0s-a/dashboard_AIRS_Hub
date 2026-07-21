'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ImportUploader } from './import-uploader'
import { ImportTable } from './import-table'
import { validateImportData, importProductsBatch, ImportRow, ValidatedRow } from '@/lib/actions/import'
import { Button } from '@/components/ui/button'
import { Save, Download } from 'lucide-react'
import { toast } from 'sonner'

type FamilyOption = { id: string; code: string; name: string }

interface ImportWizardProps {
    families: FamilyOption[]
    brands: { id: string; code: string; name: string }[]
}

export function ImportWizard({ families, brands }: ImportWizardProps) {
    const router = useRouter()
    const [rows, setRows] = useState<ValidatedRow[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [step, setStep] = useState<1 | 2>(1)

    const handleDataParsed = async (parsedData: ImportRow[]) => {
        setIsProcessing(true)
        try {
            const validated = await validateImportData(parsedData)
            setRows(validated)
            setStep(2)
        } catch (error: any) {
            toast.error(error.message || 'حدث خطأ أثناء التحقق من البيانات')
        } finally {
            setIsProcessing(false)
        }
    }

    const revalidateRows = useCallback(async (currentRows: ValidatedRow[]) => {
        setIsProcessing(true)
        try {
            const rawRows = currentRows.map(r => ({
                _id: r._id,
                name: r.name,
                itemNumber: r.itemNumber,
                familyCode: r.familyCode,
                brandCode: r.brandCode,
                color: r.color ?? '',
                size: r.size ?? '',
                capacity: r.capacity ?? '',
                volume: r.volume ?? '',
                weight: r.weight ?? '',
            }))
            const validated = await validateImportData(rawRows)
            setRows(validated)
        } catch (error) {
            console.error(error)
        } finally {
            setIsProcessing(false)
        }
    }, [])

    const handleRowChange = (id: string, field: keyof ValidatedRow, value: string) => {
        setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r))
    }

    const handleRemoveRow = (id: string) => {
        setRows(prev => prev.filter(r => r._id !== id))
    }

    useEffect(() => {
        if (step !== 2) return
        const timer = setTimeout(() => {
            if (rows.length > 0) {
                // revalidation is manual via button
            }
        }, 1000)
        return () => clearTimeout(timer)
    }, [rows, step])

    const handleRevalidate = () => {
        revalidateRows(rows)
    }

    const handleImport = async () => {
        const validRows = rows.filter(r => r.isValid)
        if (validRows.length === 0) {
            toast.error('لا توجد بيانات صحيحة لاستيرادها')
            return
        }

        setIsProcessing(true)
        try {
            const result = await importProductsBatch(validRows)
            if (result.success) {
                toast.success(result.message)
                router.push('/products')
            } else {
                toast.error(result.message)
            }
        } catch (error: any) {
            toast.error(error.message || 'حدث خطأ أثناء الاستيراد')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleImportSingleRow = async (id: string) => {
        const row = rows.find(r => r._id === id)
        if (!row || !row.isValid) return

        setIsProcessing(true)
        try {
            const result = await importProductsBatch([row])
            if (result.success) {
                toast.success('تم استيراد الصف بنجاح')
                setRows(prev => prev.filter(r => r._id !== id))
            } else {
                toast.error(result.message)
            }
        } catch (error: any) {
            toast.error(error.message || 'حدث خطأ أثناء الاستيراد')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleDownloadTemplate = () => {
        const headers = ['name', 'itemNumber', 'familyCode', 'brandCode', 'color', 'size', 'capacity', 'volume', 'weight']
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n"
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", "product_import_template.csv")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const validCount = rows.filter(r => r.isValid).length

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
                <div>
                    <h2 className="text-xl font-bold">معالج الاستيراد</h2>
                    <p className="text-sm text-muted-foreground">
                        {step === 1 ? 'الخطوة 1: رفع الملف' : 'الخطوة 2: مراجعة البيانات'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {step === 1 && (
                        <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                            <Download className="w-4 h-4" />
                            تحميل قالب CSV
                        </Button>
                    )}
                    {step === 2 && (
                        <Button variant="outline" onClick={() => setStep(1)} disabled={isProcessing}>
                            إلغاء ورفع ملف آخر
                        </Button>
                    )}
                </div>
            </div>

            {step === 1 && (
                <div className="bg-card rounded-xl border p-6">
                    <ImportUploader onDataParsed={handleDataParsed} />
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="space-x-2 space-x-reverse">
                            <span className="text-sm font-medium">إجمالي الصفوف: {rows.length}</span>
                            <span className="text-sm text-green-600 bg-green-500/10 px-2 py-1 rounded-md">صالحة: {validCount}</span>
                            <span className="text-sm text-destructive bg-destructive/10 px-2 py-1 rounded-md">بها أخطاء: {rows.length - validCount}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={handleRevalidate} disabled={isProcessing}>
                                إعادة فحص الأخطاء
                            </Button>
                            <Button onClick={handleImport} disabled={isProcessing || validCount === 0} className="gap-2">
                                <Save className="w-4 h-4" />
                                استيراد البيانات الصحيحة ({validCount})
                            </Button>
                        </div>
                    </div>

                    {isProcessing ? (
                        <div className="p-12 text-center text-muted-foreground">
                            جاري المعالجة...
                        </div>
                    ) : (
                        <ImportTable
                            rows={rows}
                            onRowChange={handleRowChange}
                            onRemoveRow={handleRemoveRow}
                            onImportRow={handleImportSingleRow}
                            families={families}
                            brands={brands}
                        />
                    )}
                </div>
            )}
        </div>
    )
}
