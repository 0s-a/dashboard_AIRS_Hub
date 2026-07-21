'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { UploadCloud, FileType, AlertCircle } from 'lucide-react'
import { ImportRow } from '@/lib/actions/import'

interface ImportUploaderProps {
    onDataParsed: (data: ImportRow[]) => void
}

export function ImportUploader({ onDataParsed }: ImportUploaderProps) {
    const [error, setError] = useState<string | null>(null)

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setError(null)
        const file = acceptedFiles[0]
        if (!file) return

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    setError('حدث خطأ أثناء قراءة الملف. تأكد من أنه بتنسيق CSV صحيح.')
                    console.error(results.errors)
                    return
                }

                const parsedData: ImportRow[] = results.data.map((row: any, index: number) => ({
                    _id: `row-${index}-${Date.now()}`,
                    name: row.name || '',
                    itemNumber: row.itemNumber || '',
                    familyCode: row.familyCode || '',
                    brandCode: row.brandCode || '',
                    color: row.color || '',
                    size: row.size || row.sizeLabel || '',
                    capacity: row.capacity || '',
                    volume: row.volume || '',
                    weight: row.weight || '',
                }))

                onDataParsed(parsedData)
            },
            error: (err) => {
                setError(err.message)
            }
        })
    }, [onDataParsed])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv']
        },
        maxFiles: 1
    })

    return (
        <div className="w-full">
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="p-4 bg-primary/10 rounded-full">
                        <UploadCloud className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <p className="text-lg font-medium">
                            {isDragActive ? 'أفلت الملف هنا...' : 'اسحب وأفلت ملف CSV هنا، أو انقر لاختيار ملف'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            الرجاء الالتزام بترتيب وتسمية الأعمدة كما هو موضح في الدليل أدناه
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-6 border rounded-xl overflow-hidden bg-card">
                <div className="bg-muted/50 px-4 py-3 border-b">
                    <h3 className="font-medium text-sm">دليل ملف البيانات (CSV)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-muted/30 text-muted-foreground">
                            <tr>
                                <th className="px-4 py-2 font-medium">الترتيب</th>
                                <th className="px-4 py-2 font-medium">اسم العمود (Header)</th>
                                <th className="px-4 py-2 font-medium">الوصف</th>
                                <th className="px-4 py-2 font-medium">نوع البيانات</th>
                                <th className="px-4 py-2 font-medium">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            <tr>
                                <td className="px-4 py-2 text-muted-foreground">1</td>
                                <td className="px-4 py-2 font-mono text-xs text-primary">name</td>
                                <td className="px-4 py-2">اسم المنتج</td>
                                <td className="px-4 py-2">نص (Text)</td>
                                <td className="px-4 py-2"><span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full dark:bg-red-900/30 dark:text-red-400">إلزامي</span></td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-muted-foreground">2</td>
                                <td className="px-4 py-2 font-mono text-xs text-primary">itemNumber</td>
                                <td className="px-4 py-2">رقم الصنف</td>
                                <td className="px-4 py-2">نص/أرقام (String)</td>
                                <td className="px-4 py-2"><span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full dark:bg-red-900/30 dark:text-red-400">إلزامي (فريد)</span></td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-muted-foreground">3</td>
                                <td className="px-4 py-2 font-mono text-xs text-primary">familyCode</td>
                                <td className="px-4 py-2">كود المنتج الرئيسي (موجود مسبقاً)</td>
                                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">نص (Code)</td>
                                <td className="px-4 py-2"><span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full dark:bg-red-900/30 dark:text-red-400">إلزامي</span></td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-muted-foreground">4</td>
                                <td className="px-4 py-2 font-mono text-xs text-primary">brandCode</td>
                                <td className="px-4 py-2">كود البراند (خانتان)</td>
                                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">نص قصير (Code)</td>
                                <td className="px-4 py-2"><span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full dark:bg-red-900/30 dark:text-red-400">إلزامي</span></td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 text-muted-foreground">5+</td>
                                <td className="px-4 py-2 font-mono text-xs text-primary">color / size / capacity / volume / weight</td>
                                <td className="px-4 py-2">قيم صفات اختيارية (نص حر حسب كود الصفة)</td>
                                <td className="px-4 py-2">نص (Text)</td>
                                <td className="px-4 py-2"><span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">اختياري</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {error && (
                <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}
        </div>
    )
}
