<?php

namespace App\Models\User\DonationManagement;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DonationDetail extends Model
{
    use HasFactory;

    protected $table = "user_donation_details";
    protected $fillable = [
        'user_id',
        'customer_id',
        'name',
        'email',
        'phone',
        'amount',
        'currency',
        'currency_position',
        'currency_symbol',
        'currency_symbol_position',
        'transaction_id',
        'status',
        'invoice',
        'receipt',
        'transaction_details',
        'bex_details',
        'donation_id',
        'payment_method',
        'conversation_id'
    ];

    public function cause()
    {
        return $this->belongsTo(Donation::class, 'donation_id', 'id');
    }
}
