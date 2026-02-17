import html2canvas from 'html2canvas'

export async function shareAsImage(elementRef: React.RefObject<HTMLDivElement | null>, filename: string) {
    if (!elementRef.current) return

    try {
        // 1. Generate Canvas
        // Increase scale for high quality (social media ready)
        const canvas = await html2canvas(elementRef.current, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#000000',
        } as any)

        // 2. Convert to Blob
        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), 'image/png', 0.95)
        )

        if (!blob) throw new Error('Failed to generate image blob')

        const file = new File([blob], filename, { type: 'image/png' })

        // 3. Share or Fallback
        if ((navigator as any).share && (navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
            await (navigator as any).share({
                files: [file],
                title: 'Check my Saturday to Sunday score!',
                text: 'Join the world\'s most intense sports origin game. Play now: https://www.playsaturdaytosunday.com'
            })
        } else {
            // Desktop Fallback: Download the image
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            alert('Sharing images is not supported on this browser. The image has been downloaded to your device! 📸')
        }
    } catch (err) {
        console.error('Error in shareAsImage:', err)
        alert('Failed to generate sharing image. Please try again.')
    }
}
