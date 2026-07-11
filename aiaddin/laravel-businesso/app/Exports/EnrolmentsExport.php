<?php

namespace App\Exports;

use App\Models\User\BasicSetting;
use App\Models\User\Language;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class EnrolmentsExport implements FromCollection, WithHeadings, WithMapping
{
  public $enrols;

  public function __construct($enrols)
  {
    $this->enrols = $enrols;
  }
  /**
   * @return \Illuminate\Support\Collection
   */
  public function collection()
  {
    return $this->enrols;
  }

  public function map($enrol): array
  {
    $bs = BasicSetting::where('user_id', Auth::guard('web')->user()->id)->firstOrFail();
    $deLang = Language::where('user_id', Auth::guard('web')->user()->id)->where('is_default', 1)->first();

    return [
      $enrol->order_id,
      $enrol->course->courseInformation()->where('language_id', $deLang->id)->pluck('title')->first(),

      ($bs->base_currency_symbol_position == 'left' ? $bs->base_currency_symbol : '') . $enrol->course_price . ($bs->base_currency_symbol_position == 'right' ? $bs->base_currency_symbol : ''),

      ($bs->base_currency_symbol_position == 'left' ? $bs->base_currency_symbol : '') . (empty($enrol->discount) ? 0 : $enrol->discount) . ($bs->base_currency_symbol_position == 'right' ? $bs->base_currency_symbol : ''),

      ($bs->base_currency_symbol_position == 'left' ? $bs->base_currency_symbol : '') . $enrol->grand_total . ($bs->base_currency_symbol_position == 'right' ? $bs->base_currency_symbol : ''),

      $enrol->billing_first_name,
      $enrol->billing_email,
      $enrol->billing_contact_number,
      $enrol->billing_city,
      $enrol->billing_state,
      $enrol->billing_country,
      $enrol->payment_method,
      $enrol->payment_status,
      $enrol->created_at
    ];
  }

  public function headings(): array
  {
    return [
      'Order Number', 'Course', 'Course Price', 'Discount', 'Total', 'Name', 'Email', 'Phone', 'City', 'State', 'Country', 'Gateway', 'Payment Status', 'Date'
    ];
  }
}
