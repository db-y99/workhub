import { title } from "@/components/primitives";
import { Card, CardBody } from "@heroui/card";

export default function SponsorPage() {
    return (
        <div className="flex flex-col items-center justify-center gap-6 py-8">
            <h1 className={title()}>Ủng hộ dự án</h1>
            <p className="text-default-600 text-center max-w-md">
                Nếu bạn thấy dự án này hữu ích, hãy ủng hộ chúng tôi bằng cách chuyển khoản qua mã QR bên dưới.
            </p>

            <Card className="max-w-md w-full">
                <CardBody className="flex flex-col items-center gap-4 p-6">
                    <div className="text-center">
                        <h2 className="text-lg font-semibold mb-2">Thông tin tài khoản</h2>
                        <div className="space-y-1 text-sm text-default-600">
                            <p><span className="font-semibold">Ngân hàng:</span> Sacombank</p>
                            <p><span className="font-semibold">Số tài khoản:</span> 070118120637</p>
                        </div>
                    </div>

                    <div className="flex justify-center border-2 border-blue-600 rounded-lg p-6 bg-white">
                        <img
                            src={`https://qr.sepay.vn/img?acc=070118120637&bank=STB&amount=0&des=${encodeURIComponent('Ung ho du an')}&template=compact&download=0`}
                            alt="Mã QR chuyển khoản ủng hộ"
                            className="w-64 h-64"
                        />
                    </div>

                    <p className="text-xs text-default-500 text-center">
                        Quét mã QR để chuyển khoản ủng hộ dự án
                    </p>
                </CardBody>
            </Card>
        </div>
    );
}

