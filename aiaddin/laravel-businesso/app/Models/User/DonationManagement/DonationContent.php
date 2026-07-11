<?php

namespace App\Models\User\DonationManagement;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DonationContent extends Model
{
    use HasFactory;

    protected $table = "user_donation_contents";
    protected $guarded = [];

    public function donation()
    {
        return $this->belongsTo(Donation::class, 'donation_id', 'id');
    }
    public function category()
    {
        return $this->belongsTo(DonationCategories::class, 'donation_category_id', 'id');
    }
}
