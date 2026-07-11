<?php

namespace App\Models\User\DonationManagement;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Donation extends Model
{
    use HasFactory;

    protected $table = "user_donations";
    protected $fillable = [
        'user_id',
        'goal_amount',
        'min_amount',
        'custom_amount',
        'image',
        'language_id'
    ];

    public function contents()
    {
        return $this->hasMany(DonationContent::class, 'donation_id', 'id');
    }
}
