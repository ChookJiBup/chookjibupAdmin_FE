"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createFestival } from "@/features/festivals/api";
import { getApiErrorMessage } from "@/lib/api/httpError";

export default function NewFestivalPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [operationStartTime, setOperationStartTime] = useState("");
  const [operationEndTime, setOperationEndTime] = useState("");
  const [dateOrderError, setDateOrderError] = useState(false);

  const createMutation = useMutation({
    mutationFn: () =>
      createFestival({
        name,
        description,
        address,
        startDate,
        endDate,
        operationStartTime,
        operationEndTime,
      }),
    onSuccess: (festival) => {
      router.push(`/console/festivals/${festival.festivalId}`);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">축제 등록 (관리자)</h1>
      <p className="body-small text-gray-500">
        축제를 생성한 사용자는 해당 축제의 [총괄관리자] 권한을 갖는다.
      </p>

      <form
        className="flex w-full max-w-md flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (startDate > endDate) {
            setDateOrderError(true);
            return;
          }
          setDateOrderError(false);
          createMutation.mutate();
        }}
      >
        <input
          type="text"
          required
          minLength={2}
          maxLength={100}
          placeholder="축제명"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="body-regular rounded-lg border px-3 py-2"
        />
        <textarea
          required
          maxLength={1000}
          placeholder="축제 설명"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="body-regular rounded-lg border px-3 py-2"
          rows={3}
        />
        <input
          type="text"
          required
          minLength={2}
          maxLength={255}
          placeholder="주소"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className="body-regular rounded-lg border px-3 py-2"
        />

        <div className="flex gap-2">
          <label className="body-small flex flex-1 flex-col gap-1 text-gray-500">
            시작일
            <input
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="body-regular rounded-lg border px-3 py-2"
            />
          </label>
          <label className="body-small flex flex-1 flex-col gap-1 text-gray-500">
            종료일
            <input
              type="date"
              required
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="body-regular rounded-lg border px-3 py-2"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <label className="body-small flex flex-1 flex-col gap-1 text-gray-500">
            운영 시작 시간
            <input
              type="time"
              step={1}
              required
              value={operationStartTime}
              onChange={(event) => setOperationStartTime(event.target.value)}
              className="body-regular rounded-lg border px-3 py-2"
            />
          </label>
          <label className="body-small flex flex-1 flex-col gap-1 text-gray-500">
            운영 종료 시간
            <input
              type="time"
              step={1}
              required
              value={operationEndTime}
              onChange={(event) => setOperationEndTime(event.target.value)}
              className="body-regular rounded-lg border px-3 py-2"
            />
          </label>
        </div>

        {dateOrderError && (
          <p className="body-small text-error">종료일은 시작일보다 빠를 수 없습니다.</p>
        )}
        {createMutation.isError && (
          <p className="body-small text-error">{getApiErrorMessage(createMutation.error)}</p>
        )}

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="body-regular-bold w-fit rounded-lg border px-4 py-2 disabled:opacity-50"
        >
          {createMutation.isPending ? "등록 중..." : "축제 등록"}
        </button>
      </form>
    </div>
  );
}
